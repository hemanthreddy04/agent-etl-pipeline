import json
from fastapi import HTTPException
from app.services.ai_service import get_genai_client, generate_content_with_retry
from app.adapters.bq_adapter import get_project_by_id

def run_suggest_dq_rules(project_id: str) -> dict:
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    selected_tables = row.selected_tables
    generated_doc = row.generated_doc
    relationships = row.relationships

    raw_tables = json.loads(selected_tables) if isinstance(selected_tables, str) else (selected_tables or [])
    tables = []
    if isinstance(raw_tables, list):
        tables = raw_tables
    elif isinstance(raw_tables, dict):
        tables = [t for sublist in raw_tables.values() for t in sublist]

    relationships_json = json.loads(relationships) if isinstance(relationships, str) and relationships else (relationships or [])

    suggested_dq = {}
    client = get_genai_client()

    from app.services.ai_service import load_skill_instructions
    base_instructions = load_skill_instructions("dq-agent")

    for table in tables:
        prompt = f"""
{base_instructions}

==================================================
BUSINESS SPECIFICATION & SCHEMA METADATA
==================================================
{generated_doc}

==================================================
TABLE RELATIONSHIPS (ERD)
==================================================
{relationships_json}

==================================================
TARGET TABLE
==================================================
Generate rules specifically for this table: {table}
Identify the schema, columns, relationships, and business purpose of this table from the BUSINESS SPECIFICATION above.
"""

        try:
            response = generate_content_with_retry(
                client=client,
                model='gemini-2.5-flash',
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            raw_text = response.text.strip()
            clean_text = raw_text
            
            # Find boundary of list '[' or object '{'
            first_idx = min((clean_text.find(c) for c in ('[', '{') if clean_text.find(c) != -1), default=-1)
            last_idx = max((clean_text.rfind(c) for c in (']', '}') if clean_text.rfind(c) != -1), default=-1)
            if first_idx != -1 and last_idx != -1:
                clean_text = clean_text[first_idx:last_idx+1]
            
            table_rules = json.loads(clean_text)
            if isinstance(table_rules, dict):
                found_list = None
                for k, v in table_rules.items():
                    if isinstance(v, list):
                        found_list = v
                        break
                if found_list is not None:
                    table_rules = found_list
                else:
                    table_rules = [table_rules]
            elif not isinstance(table_rules, list):
                table_rules = []
            
            # Guarantee field presence and table_name alignment
            for rule in table_rules:
                if isinstance(rule, dict):
                    rule["table_name"] = table
                    if "referenced_table" not in rule:
                        rule["referenced_table"] = None
            
            suggested_dq[table] = table_rules
        except Exception as e:
            import traceback
            traceback.print_exc()
            suggested_dq[table] = [{"error": f"Failed to generate rules: {str(e)}"}]

    return suggested_dq


def run_refine_dq_rules(project_id: str, feedback: str, existing_rules: dict) -> dict:
    """Refine previously generated DQ rules using human feedback."""
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    generated_doc = row.generated_doc
    client = get_genai_client()
    from app.services.ai_service import load_skill_instructions
    base_instructions = load_skill_instructions("dq-agent")
    refined_dq = {}

    for table, rules in existing_rules.items():
        existing_json = json.dumps(rules, indent=2)
        prompt = f"""
{base_instructions}

Below are the current Data Quality rules generated for table: {table}

==================================================
EXISTING RULES (JSON)
==================================================
{existing_json}

==================================================
BUSINESS SPECIFICATION
==================================================
{generated_doc}

==================================================
HUMAN FEEDBACK
==================================================
{feedback}

Your task:
1. Review the existing rules carefully.
2. Apply the human feedback to modify, add, remove, or improve the rules.
3. Keep all rules that are not affected by the feedback.
4. Return ALL rules (modified + unchanged) for this table as a valid JSON array.
"""
        try:
            response = generate_content_with_retry(
                client=client,
                model='gemini-2.5-flash',
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            raw_text = response.text.strip()
            first_idx = min((raw_text.find(c) for c in ('[', '{') if raw_text.find(c) != -1), default=-1)
            last_idx = max((raw_text.rfind(c) for c in (']', '}') if raw_text.rfind(c) != -1), default=-1)
            if first_idx != -1 and last_idx != -1:
                raw_text = raw_text[first_idx:last_idx+1]
            table_rules = json.loads(raw_text)
            if isinstance(table_rules, dict):
                found_list = next((v for v in table_rules.values() if isinstance(v, list)), None)
                table_rules = found_list if found_list else [table_rules]
            elif not isinstance(table_rules, list):
                table_rules = []
            for rule in table_rules:
                if isinstance(rule, dict):
                    rule["table_name"] = table
                    if "referenced_table" not in rule:
                        rule["referenced_table"] = None
            refined_dq[table] = table_rules
        except Exception as e:
            refined_dq[table] = existing_rules.get(table, [])

    return refined_dq
