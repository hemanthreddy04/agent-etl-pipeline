import json
import io
import csv
import re
import time
from pathlib import Path
from fastapi import HTTPException
from app.services.ai_service import get_genai_client, generate_content_with_retry
from app.adapters.bq_adapter import save_project_to_bq, get_project_by_id, get_bq_client, get_gcs_client

def _load_eda_skill() -> str:
    """Helper to dynamically load the EDA Agent skill instructions from disk."""
    skill_path = Path(__file__).parent.parent.parent.parent / ".agents" / "skills" / "eda-agent" / "SKILL.md"
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

def fetch_schemas_for_project(source_type, source_path, selected_tables) -> dict:
    schemas = {}
    
    # Normalize sourceType (always a list of active types)
    src_types = []
    if isinstance(source_type, str):
        if source_type.startswith('[') or source_type.startswith('{'):
            try: src_types = json.loads(source_type)
            except: src_types = [source_type]
        else:
            list_types = []
            if "bigquery" in source_type.lower(): list_types.append("BigQuery")
            if "gcs" in source_type.lower() or "storage" in source_type.lower(): list_types.append("GCS")
            src_types = list_types if list_types else [source_type]
    elif isinstance(source_type, list):
        src_types = source_type
        
    # Normalize sourcePath (always a dictionary mapping engine to path)
    paths_dict = {}
    if isinstance(source_path, str):
        if source_path.startswith('{') or source_path.startswith('['):
            try: paths_dict = json.loads(source_path)
            except: paths_dict = {}
        else:
            for src in src_types:
                paths_dict[src] = source_path
    elif isinstance(source_path, dict):
        paths_dict = source_path

    # Normalize selectedTables (always a dictionary mapping engine to list)
    tables_dict = {}
    if isinstance(selected_tables, str):
        try: selected_tables = json.loads(selected_tables)
        except: pass
    if isinstance(selected_tables, list):
        primary_src = src_types[0] if src_types else "BigQuery"
        tables_dict = {primary_src: selected_tables}
    elif isinstance(selected_tables, dict):
        tables_dict = selected_tables

    # Fetch BigQuery schemas
    if "BigQuery" in tables_dict and tables_dict["BigQuery"]:
        bq_path = paths_dict.get("BigQuery", "")
        if bq_path:
            try:
                client = get_bq_client()
                for table in tables_dict["BigQuery"]:
                    t = client.get_table(client.dataset(bq_path).table(table))
                    schemas[table] = [{"name": f.name, "type": f.field_type} for f in t.schema]
            except Exception as e:
                print(f"Failed to fetch BigQuery schemas in eda_agent: {e}")
                
    # Fetch GCS schemas
    if "GCS" in tables_dict and tables_dict["GCS"]:
        gcs_path = paths_dict.get("GCS", "")
        if gcs_path:
            try:
                client = get_gcs_client()
                bucket = client.bucket(gcs_path)
                for file in tables_dict["GCS"]:
                    blob = bucket.blob(file)
                    chunk = blob.download_as_text(start=0, end=1024*5)
                    f = io.StringIO(chunk)
                    reader = csv.reader(f)
                    header = next(reader, [])
                    schemas[file] = [{"name": col, "type": "STRING"} for col in header]
            except Exception as e:
                print(f"Failed to fetch GCS schemas in eda_agent: {e}")

    return schemas

def fallback_derive_relationships(selected_tables, schemas):
    relationships = []
    table_cols = {}
    for t in selected_tables:
        if t in schemas:
            table_cols[t] = [col['name'].lower() for col in schemas[t]]
            
    for t1 in selected_tables:
        for col in table_cols.get(t1, []):
            if col.endswith("_id") or col == "id":
                target_entity = col[:-3] if col.endswith("_id") else t1
                for t2 in selected_tables:
                    if t1 == t2:
                        continue
                    if target_entity in t2.lower() or t2.lower() in target_entity:
                        t2_cols = table_cols.get(t2, [])
                        t2_key = "id" if "id" in t2_cols else (col if col in t2_cols else None)
                        if t2_key:
                            relationships.append({
                                "source_table": t1,
                                "source_key": col,
                                "target_table": t2,
                                "target_key": t2_key,
                                "relationship_type": "Many-to-One",
                                "description": f"Logical relationship connecting source key '{col}' in '{t1}' to key '{t2_key}' in '{t2}'."
                            })
    return relationships

def extract_incremental_column_from_eda(eda_markdown: str, target_table: str) -> str:
    if not eda_markdown:
        return None
    lines = eda_markdown.split('\n')
    in_incremental_section = False
    for line in lines:
        if "## 2. Incremental Load Strategy" in line:
            in_incremental_section = True
            continue
        
        if in_incremental_section and line.strip().startswith('|'):
            parts = [p.strip().replace('`', '') for p in line.split('|')]
            if len(parts) >= 3:
                table_name = parts[1]
                watermark_col = parts[2]
                if table_name == target_table or table_name in target_table or target_table in table_name:
                    return watermark_col
    return None

def run_eda_agent(project_id: str, feedback: str = "", existing_eda: str = "") -> str:
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
        
    source_type = row.source_type
    source_path = row.source_path
    selected_tables = row.selected_tables
    column_context = row.column_context
    final_goal = row.final_goal
    generated_doc = row.generated_doc

    # Fetch normalized flat list of tables
    raw_tables = json.loads(selected_tables) if isinstance(selected_tables, str) else (selected_tables or [])
    flat_tables = []
    if isinstance(raw_tables, list):
        flat_tables = raw_tables
    elif isinstance(raw_tables, dict):
        flat_tables = [t for sublist in raw_tables.values() for t in sublist]

    col_ctx = json.loads(column_context) if isinstance(column_context, str) else (column_context or {})
    
    # Fetch schemas from actual source details
    schemas = fetch_schemas_for_project(source_type, source_path, raw_tables)

    feedback_instructions = ""
    if feedback and existing_eda:
        feedback_instructions = f"""
    IMPORTANT: The user has provided feedback to refine the EXISTING EDA blueprint below.
    Apply the feedback to modify the existing EDA blueprint.
    Only add, remove, or modify what the feedback specifies.
    
    EXISTING EDA BLUEPRINT:
    {existing_eda}
    
    USER FEEDBACK: "{feedback}"
    """
    elif feedback:
        feedback_instructions = f"\nAlso incorporate the following user feedback adjustments: '{feedback}'\n"

    prompt = f"""
    Task: Execute Task 1 (EDA Profiling) from your system instructions.
    
    Approved Business Specification:
    {generated_doc}

    Schemas & Column Types:
    {json.dumps(schemas, indent=2)}

    Custom Column Context/Annotations:
    {json.dumps(col_ctx, indent=2)}

    Primary Goal:
    {final_goal}

    {feedback_instructions}
    """

    try:
        client = get_genai_client()
        chat = client.chats.create(
            model='gemini-2.5-flash',
            config={'system_instruction': _load_eda_skill()}
        )
        for attempt in range(5):
            try:
                response = chat.send_message(prompt)
                eda_doc = _clean_markdown(response.text)
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
            detail=f"AI generation failed for EDA blueprint: {str(e)}"
        )

    # Extract watermark mapping for all selected tables and store in BigQuery
    watermark_map = {}
    for table in flat_tables:
        w_col = extract_incremental_column_from_eda(eda_doc, table)
        if w_col and w_col.upper() != "NONE":
            watermark_map[table] = w_col
        else:
            watermark_map[table] = "NONE"

    save_project_to_bq(project_id, {
        "generated_eda": eda_doc,
        "watermark": json.dumps(watermark_map)
    })
    return eda_doc

def run_derive_relationships(project_id: str, feedback: str = "", existing_relationships: str = "") -> list:
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
        
    source_type = row.source_type
    source_path = row.source_path
    selected_tables = row.selected_tables
    column_context = row.column_context
    generated_doc = row.generated_doc
    generated_eda = row.generated_eda

    # Fetch normalized flat list of tables
    raw_tables = json.loads(selected_tables) if isinstance(selected_tables, str) else (selected_tables or [])
    flat_tables = []
    if isinstance(raw_tables, list):
        flat_tables = raw_tables
    elif isinstance(raw_tables, dict):
        flat_tables = [t for sublist in raw_tables.values() for t in sublist]

    col_ctx = json.loads(column_context) if isinstance(column_context, str) else (column_context or {})
    
    # Fetch schemas using normalized helper
    schemas = fetch_schemas_for_project(source_type, source_path, raw_tables)

    if not schemas:
        return fallback_derive_relationships(flat_tables, col_ctx)

    feedback_instructions = ""
    if feedback and existing_relationships:
        feedback_instructions = f"""
    IMPORTANT: The user has provided feedback to refine the EXISTING relationships below.
    Apply the feedback to modify the existing relationships.
    Keep all relationships that are not affected by the feedback.
    
    EXISTING RELATIONSHIPS:
    {existing_relationships}
    
    USER FEEDBACK: "{feedback}"
    """
    elif feedback:
        feedback_instructions = f"\nAlso incorporate the following user feedback adjustments: '{feedback}'\n"

    prompt = f"""
    Task: Execute Task 2 (Table Relationship Mapping) from your system instructions.
    
    Database Tables & Schema Columns:
    {json.dumps(schemas, indent=2)}
    
    Approved Business Understanding Specification:
    {generated_doc}
    
    EDA Profiling Diagnostic Context:
    {generated_eda or 'Not available'}
    
    {feedback_instructions}
    """

    try:
        from app.main import extract_json
    except ImportError:
        def extract_json(text: str):
            import re
            text = _clean_markdown(text)
            first_bracket = min((text.find(c) for c in ('{', '[') if text.find(c) != -1), default=-1)
            last_bracket = max((text.rfind(c) for c in ('}', ']') if text.rfind(c) != -1), default=-1)
            if first_bracket != -1 and last_bracket != -1:
                text = text[first_bracket:last_bracket+1]
            return json.loads(text)

    try:
        client = get_genai_client()
        chat = client.chats.create(
            model='gemini-2.5-flash',
            config={'system_instruction': _load_eda_skill()}
        )
        for attempt in range(5):
            try:
                response = chat.send_message(prompt)
                relationships_data = extract_json(response.text.strip())
                break
            except Exception as e:
                err_msg = str(e).lower()
                if ("429" in err_msg or "resource_exhausted" in err_msg) and attempt < 4:
                    time.sleep(5 * (attempt + 1))
                    continue
                raise e
        else:
            raise Exception("Max retries exceeded for chat.send_message")

        save_project_to_bq(project_id, {"relationships": relationships_data})
        return relationships_data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI mapping derivation failed: {str(e)}"
        )
