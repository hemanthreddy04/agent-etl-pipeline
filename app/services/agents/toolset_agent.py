import json
import re
import time
from pathlib import Path
from fastapi import HTTPException
from app.services.ai_service import get_genai_client, generate_content_with_retry
from app.adapters.bq_adapter import save_project_to_bq, get_project_by_id

def _load_toolset_skill() -> str:
    """Helper to dynamically load the Toolset Agent skill instructions from disk."""
    skill_path = Path(__file__).parent.parent.parent.parent / ".agents" / "skills" / "toolset-agent" / "SKILL.md"
    try:
        with open(skill_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Warning: Failed to load SKILL.md: {e}")
        return ""

def _clean_markdown(text: str) -> str:
    """Strips markdown code block wrappers from generated text."""
    text = re.sub(r"^```[a-zA-Z]*\n", "", text, flags=re.MULTILINE)
    text = re.sub(r"```$", "", text, flags=re.MULTILINE)
    return text.strip()

def run_suggest_tools(project_id: str, current_selections: dict, feedback: str) -> str:
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
        
    source_type = row.source_type
    source_path = row.source_path
    selected_tables = row.selected_tables
    column_context = row.column_context
    generated_doc = row.generated_doc
    suggested_tools = row.suggested_tools
    generated_eda = row.generated_eda
    
    # Format the injection prompt
    if suggested_tools and feedback:
        # Refinement loop
        prompt = f"""
        Task: Refine the GCP service recommendations based on the user's feedback.

        Pipeline Context:
        - Source Type: {source_type}
        - Source Path: {source_path}
        - Selected Tables/Files: {selected_tables}

        Business Requirements & KPIs:
        {generated_doc or 'Not available'}

        EDA & Data Quality Audit:
        {generated_eda or 'Not available'}

        Previous Recommendations:
        {suggested_tools}

        User Refinement Instructions:
        "{feedback}"
        """
    else:
        # Initial generation
        user_tool_description = feedback or "No specific preference."
        prompt = f"""
        Task: Recommend the most suitable GCP services for each layer of the data pipeline.

        Pipeline Context:
        - Source Type: {source_type}
        - Source Path: {source_path}
        - Selected Tables/Files: {selected_tables}
        - User Preferences: "{user_tool_description}"

        Business Requirements & KPIs:
        {generated_doc or 'Not available'}

        EDA & Data Quality Audit:
        {generated_eda or 'Not available'}
        """

    try:
        client = get_genai_client()
        chat = client.chats.create(
            model='gemini-2.5-flash',
            config={'system_instruction': _load_toolset_skill()}
        )
        for attempt in range(5):
            try:
                response = chat.send_message(prompt)
                spec_doc = _clean_markdown(response.text)
                break
            except Exception as e:
                err_msg = str(e).lower()
                if ("429" in err_msg or "resource_exhausted" in err_msg) and attempt < 4:
                    time.sleep(5 * (attempt + 1))
                    continue
                raise e
        else:
            raise Exception("Max retries exceeded for chat.send_message")
            
        save_project_to_bq(project_id, {"suggested_tools": spec_doc})
        return spec_doc
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI GCP toolset specification failed: {str(e)}"
        )
