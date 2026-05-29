import json
import logging
from typing import Any, List
from app.core.config import settings
from voxentia.services.llm_client import OllamaClient

logger = logging.getLogger(__name__)


class LearnService:
    def __init__(self, llm_client: OllamaClient | None = None) -> None:
        self.llm = llm_client or OllamaClient(
            base_url=settings.OLLAMA_URL,
            default_model=settings.DEFAULT_MODEL,
            timeout=settings.OLLAMA_TIMEOUT,
        )

    async def generate_learning_plan(self, topic: str) -> List[dict]:
        prompt = (
            f"Erstelle einen modularen, strukturierten Lernplan für das Thema: '{topic}'.\n"
            f"Gib AUSSCHLIESSLICH ein valides JSON-Array mit genau 5 Modulen zurück, ohne weiteren Text oder Markdown.\n"
            f"Jedes Modul muss folgendes Format haben:\n"
            f"[\n"
            f"  {{\n"
            f"    \"title\": \"Name des Moduls\",\n"
            f"    \"description\": \"Kurze, motivierende Beschreibung des Inhalts\",\n"
            f"    \"completed\": false\n"
            f"  }}\n"
            f"]"
        )
        try:
            result = await self.llm.generate_json(prompt, temperature=0.5)
            if isinstance(result, list) and len(result) > 0:
                # Ensure structure is correct
                plan = []
                for idx, item in enumerate(result[:6]):
                    plan.append({
                        "id": idx + 1,
                        "title": item.get("title", f"Modul {idx + 1}"),
                        "description": item.get("description", "Inhalt wird vorbereitet..."),
                        "completed": bool(item.get("completed", False))
                    })
                return plan
        except Exception as e:
            logger.error("Failed to generate learning plan with LLM: %s", e)
        
        # Safe fallback
        return [
            {"id": 1, "title": f"Einführung in {topic}", "description": "Die wichtigsten Grundlagen und Kernkonzepte zum Einstieg.", "completed": False},
            {"id": 2, "title": f"Fortgeschrittene Konzepte von {topic}", "description": "Tieferes Verständnis der Kernarchitektur und wichtiger Prinzipien.", "completed": False},
            {"id": 3, "title": f"Praktische Anwendung & Übungen", "description": "Hands-on Beispiele und Übungsprojekte zum Mitmachen.", "completed": False},
            {"id": 4, "title": f"Best Practices & Optimierung", "description": "Wie man Fehler vermeidet und maximale Performance erzielt.", "completed": False},
            {"id": 5, "title": f"Zusammenfassung & Ausblick", "description": "Abschließende Worte, weiterführende Ressourcen und nächste Schritte.", "completed": False},
        ]

    async def generate_quiz(self, topic: str, module_title: str) -> List[dict]:
        prompt = (
            f"Erstelle ein Multiple-Choice-Quiz mit 3 spannenden Fragen für das Thema: '{topic}' "
            f"speziell zum Modul: '{module_title}'.\n"
            f"Gib AUSSCHLIESSLICH ein valides JSON-Array zurück, ohne Markdown oder Präambel.\n"
            f"Format:\n"
            f"[\n"
            f"  {{\n"
            f"    \"question\": \"Frage zum Thema?\",\n"
            f"    \"options\": [\"Option 1\", \"Option 2\", \"Option 3\", \"Option 4\"],\n"
            f"    \"correct_answer\": \"Exakte korrekte Antwort aus dem options-Array\",\n"
            f"    \"explanation\": \"Erklärung, warum diese Antwort richtig ist.\"\n"
            f"  }}\n"
            f"]"
        )
        try:
            result = await self.llm.generate_json(prompt, temperature=0.6)
            if isinstance(result, list) and len(result) > 0:
                questions = []
                for item in result[:4]:
                    options = item.get("options", [])
                    correct = item.get("correct_answer", "")
                    if correct not in options and len(options) > 0:
                        options.append(correct)
                    questions.append({
                        "question": item.get("question", "Quizfrage..."),
                        "options": options or ["A", "B", "C", "D"],
                        "correct_answer": correct or options[0],
                        "explanation": item.get("explanation", "Dies ist die korrekte Antwort.")
                    })
                return questions
        except Exception as e:
            logger.error("Failed to generate quiz with LLM: %s", e)

        # Safe fallback
        return [
            {
                "question": f"Was ist das Hauptziel von {topic}?",
                "options": ["Effizienz steigern", "Daten löschen", "Netzwerk blockieren", "Keine Funktion"],
                "correct_answer": "Effizienz steigern",
                "explanation": f"Das Hauptziel von {topic} ist die Steigerung von Effizienz und Verständnis."
            },
            {
                "question": f"Welches Konzept beschreibt das Modul '{module_title}' am besten?",
                "options": ["Praxisnahe Umsetzung", "Theoretische Leere", "Manuelle Fehler", "Zufallsprozess"],
                "correct_answer": "Praxisnahe Umsetzung",
                "explanation": f"'{module_title}' befasst sich mit der anwendungsorientierten Umsetzung der Inhalte."
            }
        ]

    async def generate_flashcards(self, topic: str) -> List[dict]:
        prompt = (
            f"Erstelle 6 Lerneinheiten/Karteikarten (Flashcards) für das Thema: '{topic}'.\n"
            f"Gib AUSSCHLIESSLICH ein valides JSON-Array zurück, ohne Markdown.\n"
            f"Format:\n"
            f"[\n"
            f"  {{\n"
            f"    \"front\": \"Begriff oder Frage (Vorderseite)\",\n"
            f"    \"back\": \"Kurze Definition oder Antwort (Rückseite)\"\n"
            f"  }}\n"
            f"]"
        )
        try:
            result = await self.llm.generate_json(prompt, temperature=0.6)
            if isinstance(result, list) and len(result) > 0:
                return [{"front": item.get("front", "Konzept"), "back": item.get("back", "Erklärung")} for item in result[:8]]
        except Exception as e:
            logger.error("Failed to generate flashcards with LLM: %s", e)

        # Fallback
        return [
            {"front": f"Grundprinzip von {topic}", "back": "Die fundamentale Regel, auf der die Technologie aufbaut."},
            {"front": f"Häufiger Fehler bei {topic}", "back": "Falsche Konfiguration oder unvollständiges Setup."},
            {"front": f"Best Practice", "back": "Regelmäßige Überprüfung der Implementierung und Tests."}
        ]

    async def generate_flashcards_from_text(self, text: str) -> List[dict]:
        prompt = (
            f"Analysiere folgenden Text und erstelle 6 Karteikarten (Flashcards) für das Lernen der Kernkonzepte.\n"
            f"Text:\n\"\"\"\n{text[:2048]}\n\"\"\"\n\n"
            f"Gib AUSSCHLIESSLICH ein valides JSON-Array zurück, ohne Markdown.\n"
            f"Format:\n"
            f"[\n"
            f"  {{\n"
            f"    \"front\": \"Begriff oder Frage (Vorderseite)\",\n"
            f"    \"back\": \"Kurze Definition oder Antwort (Rückseite)\"\n"
            f"  }}\n"
            f"]"
        )
        try:
            result = await self.llm.generate_json(prompt, temperature=0.5)
            if isinstance(result, list) and len(result) > 0:
                return [{"front": item.get("front", "Konzept"), "back": item.get("back", "Erklärung")} for item in result[:8]]
        except Exception as e:
            logger.error("Failed to generate flashcards from text: %s", e)

        return [
            {"front": "Hauptpunkt des Dokuments", "back": "Die wichtigste Kernaussage des Textes."},
            {"front": "Wichtiger Begriff im Text", "back": "Ein zentraler Begriff, der im Dokument erläutert wird."},
            {"front": "Schlussfolgerung", "back": "Das Ergebnis oder Fazit aus dem analysierten Material."}
        ]
