from voxentia.plugins.base import VoxentiaPlugin, PluginMetadata, PluginContext, PluginResponse
from voxentia_job_assistant.adapters.mock import MockJobAdapter
from typing import Dict, Any

class JobAssistantPlugin(VoxentiaPlugin):
    """Plugin zur Unterstützung bei der Jobsuche und Karriereplanung."""

    supported_intents = [
        "job_search",
        "cv_check",
        "generate_cover_letter",
        "interview_simulation",
    ]

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="job_assistant",
            display_name="Job Assistent",
            version="1.1.0",
            description="KI-gestützte Karriereberatung, CV-Check und Interview-Simulation.",
            author="Voxentia Team",
            icon="work",
            permissions=["web_access", "file_read", "llm_generate"]
        )

    async def initialize(self):
        self.adapter = MockJobAdapter()
        print("Job Assistant Plugin initialisiert.")

    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        lang = entities.get("language", "en")
        
        if intent == "job_search":
            return await self._handle_job_search(entities, lang)
            
        elif intent == "cv_check":
            return await self._handle_cv_check(entities, lang)
            
        elif intent == "generate_cover_letter":
            return await self._handle_cover_letter(entities, lang)
            
        elif intent == "interview_simulation":
            return await self._handle_interview(entities, lang)
            
        return PluginResponse(text="I'm sorry, I don't support that career feature yet.")

    async def _handle_job_search(self, entities: Dict[str, Any], lang: str) -> PluginResponse:
        query = entities.get("query", "Software Engineer")
        location = entities.get("location", "Remote")
        jobs = await self.adapter.search(query, location)
        
        text = f"I found {len(jobs)} positions for '{query}' in {location}."
        if lang == "de": text = f"Ich habe {len(jobs)} Stellen für '{query}' in {location} gefunden."
        
        return PluginResponse(text=text, data={"jobs": [j.dict() for j in jobs]})

    async def _handle_cv_check(self, entities: Dict[str, Any], lang: str) -> PluginResponse:
        cv_text = entities.get("cv_text", "")
        prompt = f"Analyze this CV and provide 3 improvement tips for a high-end position: {cv_text}"
        # In a real app, we'd use self.context.llm.generate(prompt)
        response_text = "Your CV looks solid. 1. Add more metrics to your accomplishments. 2. Highlight your leadership roles. 3. Ensure your tech stack is up to date."
        return PluginResponse(text=response_text)

    async def _handle_cover_letter(self, entities: Dict[str, Any], lang: str) -> PluginResponse:
        job_desc = entities.get("job_description", "")
        prompt = f"Generate a professional cover letter for this job: {job_desc}"
        response_text = "Dear Hiring Manager, I am writing to express my strong interest in the position..."
        return PluginResponse(text=response_text)

    async def _handle_interview(self, entities: Dict[str, Any], lang: str) -> PluginResponse:
        user_answer = entities.get("user_answer", "")
        if not user_answer:
            return PluginResponse(text="Let's start the simulation. Tell me about yourself.")
            
        # Mock feedback logic as requested
        feedback = {
            "clarity": 85,
            "confidence": 90,
            "expertise": 75,
            "flow": 88,
            "text": "Your answer was very clear and confident. Try to be more specific about your past projects."
        }
        return PluginResponse(text=feedback["text"], data={"feedback": feedback})

    async def shutdown(self):
        pass
