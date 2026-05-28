from typing import Any, Dict

from voxentia.plugins.base import PluginMetadata, PluginResponse, VoxentiaPlugin


class TeacherAssistantPlugin(VoxentiaPlugin):
    """Plugin für edukative Unterstützung, Quizze und Sprachtraining."""

    supported_intents = [
        "generate_quiz",
        "generate_flashcards",
        "summarize",
        "language_training",
    ]

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="teacher_assistant",
            display_name="Learn Assistent",
            version="1.2.0",
            description="KI-gestütztes Lernen: Lernkarten, Zusammenfassungen und Sprachtraining.",
            author="Voxentia Team",
            icon="school",
            permissions=["llm_generate"],
            min_core_version="0.1.0",
            dependencies=[],
            enabled_by_default=True,
        )

    async def initialize(self) -> None:
        pass

    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        lang = entities.get("language", "en")

        if intent == "generate_flashcards":
            return await self._handle_flashcards(entities, lang)
        if intent == "summarize":
            return await self._handle_summary(entities, lang)
        if intent == "language_training":
            return await self._handle_language_training(entities, lang)
        if intent == "generate_quiz":
            return await self._handle_quiz(entities, lang)

        return PluginResponse(text="I'm not sure how to help with that learning task.")

    async def _handle_flashcards(self, entities: Dict[str, Any], lang: str) -> PluginResponse:
        topic = entities.get("topic") or entities.get("content", "")[:200] or "General Knowledge"
        prompt = (
            f"Create 5 flashcards about '{topic}' in language {lang}. "
            "Return ONLY JSON: {{\"flashcards\": [{{\"front\": \"...\", \"back\": \"...\"}}]}}"
        )
        try:
            data = await self.context.llm.generate_json(prompt, temperature=0.3)
            cards = data.get("flashcards", []) if isinstance(data, dict) else []
        except Exception:
            cards = [{"front": f"What is {topic}?", "back": "A key concept in this field."}]
        return PluginResponse(
            text=f"I've generated {len(cards)} flashcards for {topic}.",
            data={"flashcards": cards},
        )

    async def _handle_summary(self, entities: Dict[str, Any], lang: str) -> PluginResponse:
        content = entities.get("content", "") or entities.get("message", "")
        if not content.strip():
            return PluginResponse(text="Please provide text or a topic to summarize.")
        prompt = (
            f"Summarize the following in {lang} (3–5 bullet points, concise):\n\n{content[:4000]}"
        )
        try:
            summary = await self.context.llm.generate(prompt, temperature=0.2)
        except Exception:
            summary = "Summary could not be generated right now."
        return PluginResponse(text=summary.strip(), data={"summary": summary.strip()})

    async def _handle_quiz(self, entities: Dict[str, Any], lang: str) -> PluginResponse:
        topic = entities.get("topic") or entities.get("content", "")[:200] or "general knowledge"
        prompt = (
            f"Create a 3-question quiz about '{topic}' in {lang}. "
            "Return ONLY JSON: {{\"questions\": [{{\"q\": \"...\", \"a\": \"...\"}}]}}"
        )
        try:
            data = await self.context.llm.generate_json(prompt, temperature=0.4)
            questions = data.get("questions", []) if isinstance(data, dict) else []
        except Exception:
            questions = []
        return PluginResponse(
            text=f"Quiz with {len(questions)} question(s) on {topic}.",
            data={"questions": questions},
        )

    async def _handle_language_training(self, entities: Dict[str, Any], lang: str) -> PluginResponse:
        scenario = entities.get("scenario", "small_talk")
        user_input = entities.get("user_input", "")

        if not user_input:
            prompt = (
                f"Start a short {scenario} language practice dialogue in {lang}. "
                "One friendly opening line only."
            )
            try:
                line = await self.context.llm.generate(prompt, temperature=0.6)
            except Exception:
                line = f"Let's practice {scenario}. I'll start: Hello, how are you today?"
            return PluginResponse(text=line.strip())

        prompt = (
            f"User wrote ({lang}, scenario={scenario}): \"{user_input[:500]}\"\n"
            "Give brief feedback (pronunciation, grammar, vocabulary) as 2–3 sentences."
        )
        try:
            feedback_text = await self.context.llm.generate(prompt, temperature=0.3)
        except Exception:
            feedback_text = "Good effort — keep practicing!"
        return PluginResponse(
            text=feedback_text.strip(),
            data={"language_feedback": {"tips": feedback_text.strip()}},
        )

    async def shutdown(self) -> None:
        pass
