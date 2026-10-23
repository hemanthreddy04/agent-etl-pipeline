import json
import re
from pathlib import Path
from fastapi import HTTPException
from app.services.ai_service import get_genai_client, generate_content_with_retry, load_skill_instructions
from app.adapters.bq_adapter import get_project_by_id, get_dq_rules_by_pipeline, get_anomaly_rules, get_backup_records

def run_bronze_agent(project_id: str) -> dict:
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
        
    config_path = Path(__file__).parent.parent.parent / "config" / "config.json"
    gcp_project_id = "your_project_id"
    if config_path.exists():
        with open(config_path, "r") as f:
            cfg = json.load(f)
            gcp_project_id = cfg.get("GCP_PROJECT_ID", "your_project_id")
        
    source_type = row.source_type
    source_path = row.source_path
    selected_tables = row.selected_tables
    file_formats = row.file_formats
    watermark = getattr(row, "watermark", "ingestion_timestamp")
    generated_doc = getattr(row, "generated_doc", "No schema available.")

    # Format DQ rules context
    dq_rules_raw = get_dq_rules_by_pipeline(project_id)
    dq_rules_context = ""
    if dq_rules_raw:
        for rule in dq_rules_raw:
            dq_rules_context += f"- Table: {rule.table_name}, Rule Name: {rule.rule_name}, Category: {rule.rule_category}, Column: {rule.column_name}, Referenced Table: {rule.referenced_table}, Description: {rule.description}, SQL Query: {rule.sql_query}\n"
    else:
        dq_rules_context = "No DQ rules defined."

    # Format Anomalies context
    anomaly_rules_raw = get_anomaly_rules(project_id)
    all_backup_runs = get_backup_records(project_id)
    anomalies_context = ""
    if anomaly_rules_raw:
        for anomaly in anomaly_rules_raw:
            table_name = anomaly["table_name"]
            runs = [r for r in all_backup_runs if r["table_name"] == table_name]
            runs.sort(key=lambda x: x["created_at"], reverse=True)
            
            if len(runs) >= 2:
                current_run = runs[0]
                previous_run = runs[1]
            elif len(runs) == 1:
                current_run = runs[0]
                previous_run = runs[0]
            else:
                current_run = {"start_value": "1970-01-01 00:00:00", "end_value": "1970-01-01 00:00:00"}
                previous_run = current_run
                
            sql_query = anomaly["sql_query"]
            sql_query = sql_query.replace("{current_start}", str(current_run["start_value"]))
            sql_query = sql_query.replace("{current_end}", str(current_run["end_value"]))
            sql_query = sql_query.replace("{previous_start}", str(previous_run["start_value"]))
            sql_query = sql_query.replace("{previous_end}", str(previous_run["end_value"]))
            
            anomalies_context += f"- Table: {table_name}, Anomaly Name: {anomaly['anomaly_name']}, Category: {anomaly['anomaly_category']}, Column: {anomaly['column_name']}, Description: {anomaly['description']}, SQL Query: {sql_query}\n"
    else:
        anomalies_context = "No Anomaly rules defined."

    # Load master instructions
    base_instructions = load_skill_instructions("bronze-agent")

    prompt = f"""
{base_instructions}

==================================================
PROJECT CONTEXT (Dynamic Values to Inject)
==================================================
1. GCP Project ID (Target): {gcp_project_id}
2. Selected Tables: {selected_tables}
3. Source Type: {source_type}
4. Source Path / Dataset: {source_path}
5. File Formats: {file_formats}
6. Default Watermark Column: {watermark}
7. GCS Backup Bucket: {gcp_project_id}-backup

==================================================
DATA QUALITY RULES
==================================================
{dq_rules_context}

==================================================
ANOMALIES
==================================================
{anomalies_context}

==================================================
DATA MODEL SCHEMA (For Required Columns)
==================================================
{generated_doc}

==================================================
TASK INSTRUCTIONS
==================================================
Generate ALL 7 required pipeline files based strictly on the rules in the "Source to Bronze - Complete Pipeline Architecture" instructions above.
Return a SINGLE JSON object mapping exactly to the required file structure specified in section "7. Required Agent Output Structure".
Do NOT output any markdown wrappers (e.g., ```json). Output only the raw JSON text.
"""

    client = get_genai_client()
    raw_response = generate_content_with_retry(
        client=client, 
        model='gemini-2.5-flash',
        contents=prompt,
        config={"response_mime_type": "application/json"}
    ).text or ""
    
    # Clean and parse the returned JSON
    clean_json = re.sub(r"^```[a-zA-Z]*\n", "", raw_response)
    clean_json = re.sub(r"```$", "", clean_json)
    clean_json = clean_json.strip()
    
    try:
        generated_files = json.loads(clean_json)
        return generated_files
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate valid JSON: {str(e)}")

def generate_config_loader(*args, **kwargs): return {"python_code": ""}
def generate_file_reader(*args, **kwargs): return {"python_code": ""}
def generate_bronze_orchestrator(*args, **kwargs): return {"python_code": ""}
def generate_dq_executor(*args, **kwargs): return {"python_code": ""}
def generate_bronze_pipeline(*args, **kwargs): return {"python_code": ""}
def generate_bronze_config(*args, **kwargs): return {"yaml": ""}
def generate_alert_module(*args, **kwargs): return {"python_code": ""}
