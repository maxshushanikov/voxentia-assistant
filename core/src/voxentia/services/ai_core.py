"""Unified AI Core — the single entry-point for all LLM interactions.

Instead of scattering raw LLM client calls throughout the codebase every
module that needs language-model capabilities should go through this layer.

Responsibilities
----------------
1. **Prompt Templates** — canonical templates for recurring tasks (quiz,
   summary, flashcards, title generation …).
2. **Safety Filter** — lightweight keyword-level guard that rejects or
   rewrites dangerous prompts before they reach the model.
3. **Memory Injection** — optionally prepend relevant conversation memory
   to the system prompt.
4. **Persona Management** — apply the active persona to the system prompt.
5. **Unified generate interface** — ``AICore.generate()`` and
   ``AICore.generate_json()`` delegate to the underlying LLM client and
   transparently apply all the above concerns.
"""

from __future__ import annotations

import logging
from string import Template
from typing import Any, Dict, List, Optional

from voxentia.services.llm_base import BaseLLMClient

logger = logging.getLogger("voxentia.ai_core")

# ---------------------------------------------------------------------------
# Built-in prompt templates
# ---------------------------------------------------------------------------

#: Mapping of template name → Template string.
#: Use ``$var`` placeholders (standard :class:`string.Template` syntax).
PROMPT_TEMPLATES: Dict[str, str] = {
    "quiz": (
        "Create a $count-question multiple-choice quiz about '$topic' in $lang. "
        "Return ONLY valid JSON: "
        '{"questions": [{"q": "...", "options": ["A","B","C","D"], "answer": "A"}]}'
    ),
    "flashcards": (
        "Create $count flashcards about '$topic' in $lang. "
        "Return ONLY valid JSON: "
        '{"flashcards": [{"front": "...", "back": "..."}]}'
    ),
    "summary": (
        "Summarize the following text in $lang using $count concise bullet points:\n\n$content"
    ),
    "cover_letter": (
        "Write a professional cover letter in $lang for the following job description:\n\n$job_description"
    ),
    "session_title": (
        "Generate a short title (max 5 words, $lang) for this conversation starter: '$message'"
    ),
    "cv_review": (
        "Analyse this CV and provide exactly 3 improvement tips for a senior-level role ($lang):\n\n$cv_text"
    ),
    "language_feedback": (
        "The user is practising $lang ($scenario scenario). "
        "Their message: \"$user_input\"\n"
        "Give concise feedback (2–3 sentences) on grammar, vocabulary, and flow."
    ),
}

# ---------------------------------------------------------------------------
# Safety filter
# ---------------------------------------------------------------------------

#: Simple keyword blocklist — extend as needed.
_BLOCKED_PATTERNS: List[str] = [
    "ignore previous instructions",
    "ignore all instructions",
    "disregard your instructions",
    "you are now",
    "pretend you are",
    "act as if you have no restrictions",
    "jailbreak",
]


def _is_safe(text: str) -> bool:
    """Return *False* if the text matches a known prompt-injection pattern."""
    lowered = text.lower()
    return not any(pat in lowered for pat in _BLOCKED_PATTERNS)


# ---------------------------------------------------------------------------
# AICore
# ---------------------------------------------------------------------------


class AICore:
    """Unified interface for all LLM interactions in Voxentia.

    Parameters
    ----------
    llm:
        The underlying LLM client (must implement :class:`BaseLLMClient`).
    persona_prompt:
        Optional persona system prompt to prepend to every request.
    memory_service:
        Optional memory service — if provided its
        ``build_memory_prompt(db, session_id)`` result is injected.
    safety_enabled:
        When *True* (default) the safety filter is applied before
        every LLM call.
    """

    def __init__(
        self,
        llm: BaseLLMClient,
        persona_prompt: str = "",
        memory_service: Any = None,
        safety_enabled: bool = True,
    ) -> None:
        self._llm = llm
        self._persona_prompt = persona_prompt
        self._memory_service = memory_service
        self._safety_enabled = safety_enabled

    # ------------------------------------------------------------------
    # Configuration helpers
    # ------------------------------------------------------------------

    def set_persona(self, persona_prompt: str) -> None:
        """Update the active persona system prompt."""
        self._persona_prompt = persona_prompt

    # ------------------------------------------------------------------
    # Template rendering
    # ------------------------------------------------------------------

    @staticmethod
    def render_template(name: str, **kwargs: Any) -> str:
        """Render a named prompt template with the supplied keyword arguments.

        Raises
        ------
        KeyError
            If *name* is not a registered template.
        """
        raw = PROMPT_TEMPLATES[name]
        return Template(raw).safe_substitute(**kwargs)

    @staticmethod
    def register_template(name: str, template: str) -> None:
        """Register a new (or override an existing) prompt template at runtime."""
        PROMPT_TEMPLATES[name] = template
        logger.debug("Prompt template registered/updated: %s", name)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_system(
        self,
        system: Optional[str],
        db: Any = None,
        session_id: str = "",
    ) -> str:
        """Compose the final system prompt from persona + memory + caller override."""
        parts: List[str] = []
        if self._persona_prompt:
            parts.append(self._persona_prompt)
        if self._memory_service and db and session_id:
            try:
                hint = self._memory_service.build_memory_prompt(db, session_id)
                if hint:
                    parts.append(hint)
            except Exception as exc:  # pragma: no cover
                logger.warning("Memory injection failed: %s", exc)
        if system:
            parts.append(system)
        return "\n\n".join(parts).strip()

    def _check_safety(self, text: str) -> None:
        """Raise ``ValueError`` if *text* matches the safety blocklist."""
        if self._safety_enabled and not _is_safe(text):
            logger.warning("Safety filter blocked prompt (first 120 chars): %.120s", text)
            raise ValueError(
                "The request was blocked by the safety filter. "
                "Please rephrase your message."
            )

    # ------------------------------------------------------------------
    # Public generate interface
    # ------------------------------------------------------------------

    async def generate(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        history: Optional[List[Dict[str, str]]] = None,
        db: Any = None,
        session_id: str = "",
    ) -> str:
        """Generate a text response via the configured LLM client.

        The prompt passes through the safety filter and the composed system
        prompt (persona + memory + *system*) is forwarded to the client.

        Returns
        -------
        str
            The model's text response.
        """
        self._check_safety(prompt)
        composed_system = self._build_system(system, db=db, session_id=session_id)
        return await self._llm.generate(
            prompt,
            model=model,
            system=composed_system or None,
            temperature=temperature,
            history=history,
        )

    async def generate_json(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        db: Any = None,
        session_id: str = "",
    ) -> Dict[str, Any]:
        """Generate and parse a JSON response via the configured LLM client.

        Returns
        -------
        dict
            Parsed JSON payload from the model response.
        """
        self._check_safety(prompt)
        composed_system = self._build_system(system, db=db, session_id=session_id)
        return await self._llm.generate_json(
            prompt,
            system=composed_system or None,
            model=model,
            temperature=temperature,
        )

    async def generate_from_template(
        self,
        template_name: str,
        *,
        as_json: bool = False,
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.3,
        db: Any = None,
        session_id: str = "",
        **template_vars: Any,
    ) -> Any:
        """Render *template_name* with *template_vars* and call the LLM.

        Parameters
        ----------
        template_name:
            Key in :data:`PROMPT_TEMPLATES`.
        as_json:
            When *True*, parse and return JSON; otherwise return raw text.
        **template_vars:
            Variables substituted into the template.

        Returns
        -------
        str | dict
            Raw text or parsed JSON depending on *as_json*.
        """
        prompt = self.render_template(template_name, **template_vars)
        if as_json:
            return await self.generate_json(
                prompt,
                system=system,
                model=model,
                temperature=temperature,
                db=db,
                session_id=session_id,
            )
        return await self.generate(
            prompt,
            system=system,
            model=model,
            temperature=temperature,
            db=db,
            session_id=session_id,
        )
