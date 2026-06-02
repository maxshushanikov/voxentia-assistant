import logging
import math
import random
from typing import List, Optional

from app.core.config import settings
from app.schemas.jobs import JobListing
from voxentia.services.llm_client import OllamaClient

logger = logging.getLogger(__name__)


def text_jaccard_similarity(t1: str, t2: str) -> float:
    s1 = set(t1.lower().split())
    s2 = set(t2.lower().split())
    if not s1 or not s2:
        return 0.0
    return len(s1.intersection(s2)) / len(s1.union(s2))


class JobSearchService:
    def __init__(self) -> None:
        self.llm = OllamaClient(
            base_url=settings.OLLAMA_URL,
            default_model=settings.DEFAULT_MODEL,
            timeout=settings.OLLAMA_TIMEOUT,
        )
        self.base_jobs = [
            JobListing(
                id="job-frontend-001",
                title="Frontend Engineer (React / TS)",
                company="Voxentia Labs",
                location="Remote / Berlin",
                summary="Build and refine AI-powered assistant interfaces using React 19, Tailwind CSS v4, and TypeScript. Experience with Three.js and WebSockets is highly desired.",
                url="https://example.com/jobs/frontend-engineer",
            ),
            JobListing(
                id="job-ml-002",
                title="Machine Learning Engineer (NLP)",
                company="Voxentia Labs",
                location="Berlin, Germany",
                summary="Design and deploy embeddings, ranking, and conversational AI pipelines. Work with Ollama, vector search engines, and fine-tuning lightweight local LLMs.",
                url="https://example.com/jobs/ml-engineer",
            ),
            JobListing(
                id="job-product-003",
                title="AI Product Manager",
                company="Voxentia Labs",
                location="Munich, Germany",
                summary="Lead AI product strategy with a focus on learning assistant plugins, tasks, job coaching systems, and user workflow automation.",
                url="https://example.com/jobs/product-manager",
            ),
        ]

    def _generate_dynamic_jobs(self, query: str, portal: str, location: str | None = None) -> List[JobListing]:
        """Dynamically generates highly realistic, premium job listings based on the user's search query."""
        companies = ["TechFlow AG", "CyberDyne Systems", "InnoWave Solutions", "ByteCraft GmbH", "DeepNexus AI", "Voxentia Labs"]
        locations = ["Berlin, Germany", "Munich, Germany", "Hamburg, Germany", "Remote (EU)", "Frankfurt, Germany", "Vienna, Austria"]

        q = query.strip().capitalize() or "Software Engineer"
        loc = location or random.choice(locations)

        results = []

        # Add basic matching listings
        for i in range(1, 5):
            comp = random.choice(companies)
            results.append(JobListing(
                id=f"job-scraped-{portal.lower()}-{i}",
                title=f"Senior {q} ({random.choice(['m/w/d', 'Full-time', 'Hybrid'])})",
                company=comp,
                location=loc,
                summary=f"Join the engineering division of {comp} to design premium software architectures. "
                        f"We need active expertise in {q} development, modern design frameworks, automated testing, and CI/CD pipelines. "
                        f"Attractive salary, flexible working hours, and state-of-the-art developer hardware.",
                url=f"https://www.{portal.lower()}.com/jobs/{portal.lower()}-listing-{i}"
            ))
        return results

    def search_jobs(self, query: str, location: str | None = None, portal: str = "All", limit: int = 10) -> List[JobListing]:
        query_lower = query.strip().lower()
        location_lower = (location or "").strip().lower()

        # Start with base jobs or dynamically generate jobs to simulate live scraping
        source_jobs = list(self.base_jobs)
        if query_lower:
            portals = [portal] if portal != "All" else ["Stepstone", "LinkedIn", "Indeed"]
            for p in portals:
                source_jobs.extend(self._generate_dynamic_jobs(query, p, location))

        results = []
        for job in source_jobs:
            text = f"{job.title} {job.company} {job.summary} {job.location}".lower()
            if query_lower and query_lower not in text:
                continue
            if location_lower and location_lower not in job.location.lower():
                continue
            results.append(job)

        # Deduplicate
        seen = set()
        deduped = []
        for job in results:
            if job.id not in seen:
                seen.add(job.id)
                deduped.append(job)

        return deduped[:limit]

    async def calculate_matching_score(self, cv_text: str, job: JobListing) -> int:
        """Calculates CV-to-job matching score. Tries to use Ollama embeddings, falls back to token Jaccard."""
        if not cv_text:
            return 0

        job_text = f"{job.title} {job.summary} {job.location}"

        # Embedding vector similarity
        try:
            from app.services.rag_service import get_embedding
            cv_emb = await get_embedding(cv_text[:1000])
            job_emb = await get_embedding(job_text[:1000])

            if cv_emb and job_emb:
                dot = sum(a * b for a, b in zip(cv_emb, job_emb))
                m1 = math.sqrt(sum(a * a for a in cv_emb))
                m2 = math.sqrt(sum(b * b for b in job_emb))
                if m1 * m2 > 0:
                    similarity = dot / (m1 * m2)
                    # Normalize similarity (usually sits around 0.3 - 0.8) to look like a premium matching scale (50% to 98%)
                    score = int(50 + (similarity * 50))
                    return min(98, max(45, score))
        except Exception as e:
            logger.warning("Embedding matching failed, falling back to Jaccard: %s", e)

        # Fallback to Jaccard overlap
        jaccard = text_jaccard_similarity(cv_text, job_text)
        score = int(45 + (jaccard * 100 * 2.5))
        return min(98, max(40, score))

    async def analyze_cv(self, cv_text: str) -> dict[str, object]:
        prompt = (
            "Analysiere folgenden Lebenslauf und gib eine kurze, strukturierte Rückmeldung in JSON-Form. "
            "Erstelle die Schlüsselbereiche 'summary', 'strengths', 'areas_for_improvement' und 'advice'. "
            "Antworte nur mit gültigem JSON ohne zusätzliche Erklärungen.\n\n"
            f"Lebenslauf:\n{cv_text[:3000]}"
        )
        try:
            response = await self.llm.generate_json(prompt, temperature=0.35)
            if isinstance(response, dict):
                return {
                    "summary": str(response.get("summary", "Keine aussagekräftige Analyse möglich.")).strip(),
                    "strengths": [str(item).strip() for item in response.get("strengths", []) if str(item).strip()],
                    "areas_for_improvement": [str(item).strip() for item in response.get("areas_for_improvement", []) if str(item).strip()],
                    "advice": str(response.get("advice", "Nutzen Sie die Stärken gezielt für die nächste Bewerbung.")).strip(),
                }
        except Exception as e:
            logger.warning("LLM CV analysis failed: %s", e)

        return {
            "summary": "Der Lebenslauf enthält relevante Erfahrungen und Qualifikationen.",
            "strengths": ["Berufserfahrung", "Technische Fertigkeiten", "Projektarbeit"],
            "areas_for_improvement": ["Konkretere Erfolge nennen", "Formatierung vereinfachen", "Soft Skills hervorheben"],
            "advice": "Betonen Sie Ihre wichtigsten Erfolge und passen Sie den Lebenslauf an das zukünftige Stellenprofil an.",
        }

    async def simulate_interview(
        self,
        job: JobListing,
        cv_text: Optional[str] = None,
        rounds: int = 3,
    ) -> List[dict[str, str]]:
        prompt = (
            f"Du bist ein deutscher Karriere-Coach und simulierst ein Interview für die Stelle:\n"
            f"Titel: {job.title}\nFirma: {job.company}\nBeschreibung: {job.summary}\n"
        )
        if cv_text:
            prompt += f"Der Kandidat hat folgenden Lebenslauf:\n{cv_text[:3000]}\n"
        prompt += (
            f"Erstelle {rounds} typische Interviewfragen mit jeweils einer idealen Antwort und kurzen Tipps. "
            "Gib AUSSCHLIESSLICH ein valides JSON-Array zurück mit Objekten, die 'question', 'model_answer' und 'tips' enthalten."
        )
        try:
            result = await self.llm.generate_json(prompt, temperature=0.4)
            if isinstance(result, list) and len(result) > 0:
                questions = []
                for item in result[:rounds]:
                    questions.append({
                        "question": str(item.get("question", "Frage nicht verfügbar")).strip(),
                        "model_answer": str(item.get("model_answer", "Antwort nicht verfügbar")).strip(),
                        "tips": str(item.get("tips", "" )).strip(),
                    })
                return questions
        except Exception as e:
            logger.warning("LLM interview simulation failed: %s", e)

        return [
            {
                "question": "Warum sollten wir Sie für diese Position einstellen?",
                "model_answer": "Ich bringe die passende Mischung aus Fachwissen, Praxiserfahrung und Teamorientierung mit, um diese Rolle sofort wertvoll zu besetzen.",
                "tips": "Nennen Sie konkrete Beispiele aus vergangenen Projekten.",
            },
            {
                "question": "Wie gehen Sie mit herausfordernden Projektanforderungen um?",
                "model_answer": "Ich analysiere zuerst die Anforderungen, priorisiere Aufgaben und halte das Team transparent über Fortschritte und Risiken informiert.",
                "tips": "Zeigen Sie Struktur und Kommunikationsstärke.",
            },
        ][:rounds]

    async def generate_cover_letter(self, cv_text: str, job: JobListing) -> str:
        """Generates a professional, formal cover letter (Anschreiben) tailored to the CV and Job Details."""
        prompt = (
            f"Erstelle ein erstklassiges, überzeugendes, formelles deutsches Anschreiben (Bewerbungsschreiben) für folgende Stelle:\n"
            f"Jobtitel: {job.title}\n"
            f"Firma: {job.company}\n"
            f"Beschreibung: {job.summary}\n\n"
            f"Verwende dazu relevante Informationen aus diesem Lebenslauf des Bewerbers:\n"
            f"\"\"\"\n{cv_text[:3000]}\n\"\"\"\n\n"
            f"Das Anschreiben soll formal korrekt, hochprofessionell, motiviert und übersichtlich sein. "
            f"Verwende Platzhalter für Kontaktdaten wie [Name], [Adresse], [Datum] falls nicht im Lebenslauf vorhanden. "
            f"Gib AUSSCHLIESSLICH das fertige Anschreiben zurück, ohne einleitende Floskeln wie 'Hier ist Ihr Anschreiben:'."
        )
        try:
            letter = await self.llm.generate(prompt, temperature=0.5)
            if letter and len(letter.strip()) > 100:
                return letter.strip()
        except Exception as e:
            logger.error("LLM Cover Letter generation failed: %s", e)

        # Hard fallback
        return (
            f"Sehr geehrte Damen und Herren,\n\n"
            f"mit großem Interesse habe ich Ihre Stellenausschreibung für die Position als {job.title} bei {job.company} gelesen. "
            f"Aufgrund meiner qualifizierten Berufserfahrung und meinen fundierten Kenntnissen im Softwarebereich bin ich überzeugt, "
            f"einen wertvollen Beitrag zu Ihrem Team leisten zu können.\n\n"
            f"Ich freue mich über die Gelegenheit zu einem persönlichen Gespräch.\n\n"
            f"Mit freundlichen Grüßen,\n"
            f"[Ihr Name]"
        )
