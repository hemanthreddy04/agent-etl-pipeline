import json
import os
import re
import time
from pathlib import Path
from fastapi import HTTPException
from app.services.ai_service import get_genai_client, generate_content_with_retry
from app.adapters.bq_adapter import save_project_to_bq, get_project_by_id

def _load_business_skill() -> str:
    """Helper to dynamically load the Business Agent skill instructions from disk."""
    skill_path = Path(__file__).parent.parent.parent.parent / ".agents" / "skills" / "business-agent" / "SKILL.md"
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

def run_business_agent(config_id: str, source_type: str, source_path: str, selected_tables: list, 
                       business_context: str, column_context: dict, final_goal: str, 
                       schemas: dict, feedback_history: list, file_formats: dict = None) -> str:
    metadata_summary = schemas or {}
    
    # 1. Merge custom user column context annotations on top of the schemas
    for table_name, custom_cols in column_context.items():
        if table_name in metadata_summary:
            for col in metadata_summary[table_name]:
                c_name = col.get("name")
                if c_name in custom_cols and custom_cols[c_name].strip():
                    col["description"] = custom_cols[c_name]

    # 2. Define the schema exploration tool for the AI
    def explore_schema(table_name: str) -> str:
        """Tool to look up the schema of a specific table to understand its columns and structure."""
        if table_name in metadata_summary:
            return json.dumps(metadata_summary[table_name])
        return f"Schema for {table_name} not found."

    # 3. Format the dynamic context for this run
    feedback_instructions = ""
    if feedback_history:
        feedback_instructions = "\nAlso incorporate the following user feedback instructions into the spec:\n" + "\n".join([f"- {item}" for item in feedback_history])

    prompt = f"""
    Project Context & Details:
    1. Sources: {source_type} -> {source_path}
    2. Selected Tables/Files: {selected_tables}
    3. Business Context provided by User: {business_context}
    4. Custom Column Context/Annotations: {json.dumps(column_context, indent=2)}
    5. Primary Pipeline Goal/KPI Target: {final_goal}
    {feedback_instructions}

    INSTRUCTIONS:
    - You must use the `explore_schema` tool to investigate the structure of the tables listed in "Selected Tables/Files" BEFORE writing the document.
    - Once you understand the tables and columns, generate the final document adhering strictly to the formats defined in your system instructions.
    """
    
    # 4. Execute the Agentic Loop
    try:
        client = get_genai_client()
        chat = client.chats.create(
            model='gemini-2.5-flash',
            config={
                'tools': [explore_schema],
                'system_instruction': _load_business_skill()
            }
        )
        
        # We wrap in a basic retry loop in case of transient API rate limits
        for attempt in range(5):
            try:
                response = chat.send_message(prompt)
                generated_doc = _clean_markdown(response.text)
                break
            except Exception as e:
                err_msg = str(e).lower()
                if ("429" in err_msg or "resource_exhausted" in err_msg) and attempt < 4:
                    time.sleep(5 * (attempt + 1))
                    continue
                raise e
        else:
            raise Exception("Max retries exceeded for chat.send_message")
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed for project spec blueprint: {str(e)}"
        )

    # 5. Persist the generated output to BigQuery state
    save_project_to_bq(config_id, {
        "source_type": source_type,
        "source_path": source_path,
        "selected_tables": selected_tables,
        "business_context": business_context,
        "column_context": column_context,
        "final_goal": final_goal,
        "generated_doc": generated_doc,
        "status": "pending_approval",
        "feedback_history": feedback_history or [],
        "file_formats": file_formats or {}
    })

    return generated_doc

def run_business_refinement(project_id: str, feedback: str) -> str:
    # 1. Load project context
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
        
    current_doc = row.generated_doc
    feedback_history = row.feedback_history
    feedback_list = json.loads(feedback_history) if isinstance(feedback_history, str) else (feedback_history or [])
    feedback_list.append(feedback)
    
    # 2. Build refinement prompt
    prompt = f"""
    Update the existing Business Understanding document for the ETL/ELT pipeline based on your instructions.
    
    Current Document:
    {current_doc}
    
    User Feedback / Adjustments Required:
    "{feedback}"
    
    TASK: Incorporate the user feedback precisely and intelligently. Re-write the sections dynamically to align with the new guidance, fixing any inaccuracies. Ensure you follow all formatting constraints from your system instructions.
    """
    
    # 3. Execute refinement
    try:
        client = get_genai_client()
        response = generate_content_with_retry(
            client=client,
            model='gemini-2.5-flash',
            contents=prompt,
            config={'system_instruction': _load_business_skill()}
        )
        updated_doc = _clean_markdown(response.text)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI refinement failed for project spec blueprint: {str(e)}"
        )
        
    # 4. Save updated state
    save_project_to_bq(project_id, {
        "generated_doc": updated_doc,
        "feedback_history": feedback_list
    })
    
    return updated_doc
