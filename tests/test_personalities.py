from app.core.personalities import load_personalities


def test_load_personalities_includes_academic():
    data = load_personalities()
    assert "professional" in data
    assert "academic" in data
    assert "en" in data["academic"]
