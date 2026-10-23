import json
from fastapi import HTTPException
from google.cloud import bigquery
from app.services.ai_service import get_genai_client, generate_content_with_retry
from app.adapters.bq_adapter import get_project_by_id, get_bq_client, get_bq_column_type
from app.utils.config import GCP_PROJECT_ID

def bq_safe_table_name(table_name: str) -> str:
    if '/' in table_name or table_name.endswith('.csv') or table_name.endswith('.json') or table_name.endswith('.parquet'):
        base = table_name.split('/')[-1]
        for ext in ['.csv', '.json', '.parquet', '.xlsx', '.xls']:
            if base.lower().endswith(ext):
                base = base[:-len(ext)]
                break
        import re
        base = re.sub(r'[^a-zA-Z0-9_]', '_', base)
        return base
    return table_name

def get_table_schema_summary(dataset_name: str, table_name: str) -> str:
    try:
        client = get_bq_client()
        query = f"""
            SELECT column_name, data_type
            FROM `{GCP_PROJECT_ID}.{dataset_name}.INFORMATION_SCHEMA.COLUMNS`
            WHERE table_name = @table_name
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("table_name", "STRING", table_name)]
        )
        query_job = client.query(query, job_config=job_config)
        results = list(query_job.result())
        schema_summary = []
        for r in results:
            schema_summary.append(f"- {r.column_name} ({r.data_type})")
        return "\n".join(schema_summary)
    except Exception as e:
        print(f"Failed to fetch schema for {table_name}: {e}")
        return "(Schema not available)"

def run_suggest_anomalies(project_id: str) -> dict:
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    raw_path = row.source_path
    dataset_id = ""
    if isinstance(raw_path, str):
        if raw_path.startswith('{') or raw_path.startswith('['):
            try:
                paths_dict = json.loads(raw_path)
                dataset_id = paths_dict.get("BigQuery", "")
            except:
                dataset_id = raw_path
        else:
            dataset_id = raw_path
    elif isinstance(raw_path, dict):
        dataset_id = raw_path.get("BigQuery", "")

    if not dataset_id:
        raise HTTPException(status_code=400, detail="Missing source_path (dataset ID) in project metadata")

    selected_tables = row.selected_tables
    generated_doc = row.generated_doc
    watermark_col_mapping = row.watermark

    raw_tables = json.loads(selected_tables) if isinstance(selected_tables, str) else (selected_tables or [])
    tables = []
    if isinstance(raw_tables, list):
        tables = raw_tables
    elif isinstance(raw_tables, dict):
        tables = [t for sublist in raw_tables.values() for t in sublist]

    watermark_map = json.loads(watermark_col_mapping) if isinstance(watermark_col_mapping, str) else (watermark_col_mapping or {})

    suggested_anomalies = {}
    client = get_genai_client()

    from app.services.ai_service import load_skill_instructions
    base_instructions = load_skill_instructions("anomaly-agent")

    for table in tables:
        w_col = watermark_map.get(table)
        col_type = 'STRING'
        bq_table = bq_safe_table_name(table)
        if w_col and w_col.upper() != "NONE":
            col_type = get_bq_column_type(dataset_id, bq_table, w_col)

        schema_summary = get_table_schema_summary(dataset_id, bq_table)
        from app.utils.config import GCP_PROJECT_ID
        full_table_name = f"{GCP_PROJECT_ID}.{dataset_id}.{bq_table}"
        backtick_table_name = f"`{GCP_PROJECT_ID}.{dataset_id}.{bq_table}`"

        prompt = f"""
{base_instructions}

==================================================
BIGQUERY TABLE
==================================================
{full_table_name}

==================================================
SCHEMA
==================================================
{schema_summary}

==================================================
ENTERPRISE KNOWLEDGE HUB (Business Specification)
==================================================
{generated_doc}

==================================================
TARGET DETAILS FOR SQL TEMPLATE
==================================================
- fully_qualified_table_name: {backtick_table_name}
- watermark_column: {w_col if w_col and w_col != 'NONE' else '(no filter)'}
- watermark_column_type: {col_type}
- table: {table}

Use these specific values when writing the compiled_sql output.
"""
        try:
            response = generate_content_with_retry(
                client=client,
                model='gemini-2.5-flash',
                contents=prompt,
                config={'response_mime_type': 'application/json'}
            )
            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
            anom_list = json.loads(raw_text)
            
            # Post-process compiled_sql to normalize curly brace formatting
            for rule in anom_list:
                sql = rule.get("compiled_sql", "")
                # Normalize double braces to single braces
                sql = sql.replace("{{previous_start}}", "{previous_start}")
                sql = sql.replace("{{previous_end}}", "{previous_end}")
                sql = sql.replace("{{current_start}}", "{current_start}")
                sql = sql.replace("{{current_end}}", "{current_end}")
                
                # Make sure the placeholders are wrapped in single curly braces
                sql = sql.replace("'previous_start'", "'{previous_start}'")
                sql = sql.replace("'previous_end'", "'{previous_end}'")
                sql = sql.replace("'current_start'", "'{current_start}'")
                sql = sql.replace("'current_end'", "'{current_end}'")
                # Ensure table name is always backtick-quoted (handles hyphens in project ID)
                if full_table_name in sql and f"`{full_table_name}`" not in sql:
                    sql = sql.replace(full_table_name, f"`{full_table_name}`")
                rule["compiled_sql"] = sql

            suggested_anomalies[table] = anom_list
        except Exception as e:
            print(f"Failed to generate anomalies for table {table}: {e}")
            suggested_anomalies[table] = []

    return suggested_anomalies


def run_refine_anomalies(project_id: str, feedback: str, existing_anomalies: dict) -> dict:
    """Refine previously generated anomaly rules using human feedback."""
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    client = get_genai_client()
    refined_anomalies = {}

    from app.services.ai_service import load_skill_instructions
    base_instructions = load_skill_instructions("anomaly-agent")

    # Resolve dataset_id and watermark info for backtick-quoted table names
    raw_path = row.source_path or ""
    dataset_id = ""
    if isinstance(raw_path, str):
        if raw_path.startswith('{') or raw_path.startswith('['):
            try:
                paths_dict = json.loads(raw_path)
                dataset_id = paths_dict.get("BigQuery", "")
            except:
                dataset_id = raw_path
        else:
            dataset_id = raw_path
    elif isinstance(raw_path, dict):
        dataset_id = raw_path.get("BigQuery", "")

    watermark_col_mapping = row.watermark
    watermark_map = json.loads(watermark_col_mapping) if isinstance(watermark_col_mapping, str) else (watermark_col_mapping or {})

    for table, rules in existing_anomalies.items():
        existing_json = json.dumps(rules, indent=2)
        bq_table = bq_safe_table_name(table)
        w_col = watermark_map.get(table, "ingestion_timestamp")
        col_type = "TIMESTAMP"
        if w_col and w_col.upper() != "NONE" and dataset_id:
            try:
                col_type = get_bq_column_type(dataset_id, bq_table, w_col)
            except:
                pass
        full_table_name = f"{GCP_PROJECT_ID}.{dataset_id}.{bq_table}"
        backtick_table_name = f"`{full_table_name}`"

        prompt = f"""
{base_instructions}

Below are the current Anomaly Detection rules generated for table: {table}

==================================================
EXISTING ANOMALY RULES (JSON)
==================================================
{existing_json}

==================================================
TARGET DETAILS FOR SQL TEMPLATE
==================================================
- fully_qualified_table_name: {backtick_table_name}
- watermark_column: {w_col if w_col and w_col != 'NONE' else '(no filter)'}
- watermark_column_type: {col_type}
- table: {table}

==================================================
HUMAN FEEDBACK
==================================================
{feedback}

Your task:
1. Review the existing anomaly rules carefully.
2. Apply the human feedback to modify, add, remove, or improve the rules.
3. Keep all rules not affected by the feedback.
4. Return ALL rules (modified + unchanged) as a valid JSON array.
"""
        try:
            response = generate_content_with_retry(
                client=client,
                model='gemini-2.5-flash',
                contents=prompt,
                config={'response_mime_type': 'application/json'}
            )
            raw_text = response.text.strip()
            first_idx = min((raw_text.find(c) for c in ('[', '{') if raw_text.find(c) != -1), default=-1)
            last_idx = max((raw_text.rfind(c) for c in (']', '}') if raw_text.rfind(c) != -1), default=-1)
            if first_idx != -1 and last_idx != -1:
                raw_text = raw_text[first_idx:last_idx+1]
            anom_list = json.loads(raw_text)
            if not isinstance(anom_list, list):
                anom_list = []
            # Post-process: normalize placeholders and backtick table name
            for rule in anom_list:
                sql = rule.get("compiled_sql", "")
                sql = sql.replace("{{previous_start}}", "{previous_start}")
                sql = sql.replace("{{previous_end}}", "{previous_end}")
                sql = sql.replace("{{current_start}}", "{current_start}")
                sql = sql.replace("{{current_end}}", "{current_end}")
                if full_table_name in sql and f"`{full_table_name}`" not in sql:
                    sql = sql.replace(full_table_name, f"`{full_table_name}`")
                rule["compiled_sql"] = sql
            refined_anomalies[table] = anom_list
        except Exception as e:
            print(f"Failed to refine anomalies for table {table}: {e}")
            refined_anomalies[table] = existing_anomalies.get(table, [])

    return refined_anomalies
