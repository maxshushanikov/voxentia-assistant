"""Lightweight A/B testing — SQLite assignments, pipeline prompt variants."""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

EXPERIMENTS: dict[str, dict] = {
    "response_style_v1": {
        "description": "Friendly suffix vs neutral control",
        "variants": {
            "control": {"prompt_suffix": ""},
            "treatment": {
                "prompt_suffix": "\n\nAntworte besonders klar und strukturiert mit kurzen Absätzen."
            },
        },
        "default_variant": "control",
    },
    "temperature_v1": {
        "description": "Lower temperature for treatment",
        "variants": {
            "control": {"temperature_delta": 0.0},
            "treatment": {"temperature_delta": -0.15},
        },
        "default_variant": "control",
    },
}


@dataclass
class ABAssignment:
    experiment_id: str
    variant: str
    prompt_suffix: str = ""
    temperature_delta: float = 0.0


def assign_variant(session_id: str, experiment_id: str) -> ABAssignment:
    exp = EXPERIMENTS.get(experiment_id)
    if not exp:
        return ABAssignment(experiment_id, "control")

    variants = list(exp["variants"].keys())
    digest = hashlib.sha256(f"{session_id}:{experiment_id}".encode()).hexdigest()
    idx = int(digest[:8], 16) % len(variants)
    variant = variants[idx]
    cfg = exp["variants"][variant]
    return ABAssignment(
        experiment_id=experiment_id,
        variant=variant,
        prompt_suffix=cfg.get("prompt_suffix", ""),
        temperature_delta=float(cfg.get("temperature_delta", 0.0)),
    )


def apply_ab_to_context(ctx, assignment: ABAssignment) -> None:
    if assignment.prompt_suffix:
        ctx.system_prompt = (ctx.system_prompt or "") + assignment.prompt_suffix
    if assignment.temperature_delta:
        ctx.temperature = max(0.0, min(2.0, ctx.temperature + assignment.temperature_delta))


def record_event_db(db, session_id: str, assignment: ABAssignment, intent: str, latency_ms: float) -> None:
    try:
        from app.models.experiment import ExperimentEvent

        db.add(
            ExperimentEvent(
                experiment_id=assignment.experiment_id,
                variant=assignment.variant,
                session_id=session_id,
                intent=intent or "unknown",
                latency_ms=latency_ms,
            )
        )
        db.commit()
    except Exception as e:
        logger.debug("AB event record skipped: %s", e)
        db.rollback()
