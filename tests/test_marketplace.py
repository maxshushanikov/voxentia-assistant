from app.services.marketplace_service import MarketplaceService


def test_list_catalog_marks_builtin_installed():
    svc = MarketplaceService()
    items = svc.list_catalog(installed_ids=set())
    assert len(items) >= 1
    calendar = next((p for p in items if p["id"] == "calendar"), None)
    assert calendar is not None
    assert calendar["builtin"] is True
    assert calendar["installed"] is True
