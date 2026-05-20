from voxentia.orchestrator.ab_testing import assign_variant, apply_ab_to_context, EXPERIMENTS
from voxentia.orchestrator.pipeline import PipelineContext


def test_assign_variant_deterministic():
    a = assign_variant("sess_abc", "response_style_v1")
    b = assign_variant("sess_abc", "response_style_v1")
    assert a.variant == b.variant
    assert a.experiment_id == "response_style_v1"


def test_apply_ab_suffix():
    ctx = PipelineContext(raw_message="hi", system_prompt="Base", temperature=0.7)
    assignment = assign_variant("sess_x", "response_style_v1")
    if assignment.prompt_suffix:
        apply_ab_to_context(ctx, assignment)
        assert "Base" in ctx.system_prompt
        assert len(ctx.system_prompt) > len("Base")


def test_experiments_defined():
    assert "response_style_v1" in EXPERIMENTS
