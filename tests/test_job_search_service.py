import asyncio

from app.services.job_search_service import JobSearchService


def test_search_jobs_filters_by_query():
    service = JobSearchService()
    results = service.search_jobs(query="Machine Learning", location="Berlin", portal="All", limit=5)

    assert isinstance(results, list)
    assert len(results) > 0
    assert any("machine" in job.title.lower() or "machine" in job.summary.lower() for job in results)


def test_calculate_matching_score_returns_int():
    service = JobSearchService()
    fake_cv = "Experienced machine learning engineer with NLP, embeddings, and AI product delivery."
    results = service.search_jobs(query="Machine Learning", location=None, portal="All", limit=1)
    job = results[0] if results else None

    assert job is not None
    score = asyncio.run(service.calculate_matching_score(fake_cv, job))
    assert isinstance(score, int)
    assert 0 <= score <= 100
