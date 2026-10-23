import os
import time
from google import genai
from google.genai.errors import ClientError

def get_genai_client():
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        return genai.Client()
    else:
        # Resolve active GCP project dynamically from Application Default Credentials (ADC)
        project_id = None
        try:
            import google.auth
            _, project_id = google.auth.default()
        except Exception:
            pass
        # Falls back to Google Cloud Vertex AI
        return genai.Client(vertexai=True, project=project_id)

def generate_content_with_retry(client, model, contents, max_retries=5, delay=5, config=None):
    for attempt in range(max_retries):
        try:
            return client.models.generate_content(model=model, contents=contents, config=config)
        except Exception as e:
            err_msg = str(e).lower()
            is_rate_limit = "429" in err_msg or "resource_exhausted" in err_msg or "rate limit" in err_msg
            if is_rate_limit and attempt < max_retries - 1:
                time.sleep(delay * (attempt + 1))
                continue
            raise e

def load_skill_instructions(skill_name: str) -> str:
    from pathlib import Path
    skill_path = Path(__file__).parent.parent.parent / ".agents" / "skills" / skill_name / "SKILL.md"
    try:
        return skill_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"Warning: Failed to load SKILL.md for {skill_name}: {e}")
        return ""
