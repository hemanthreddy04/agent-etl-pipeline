import json
from fastapi import APIRouter, HTTPException
from app.adapters.bq_adapter import get_bq_client, get_project_by_id, BQ_TABLE_ID, get_dq_rules_by_pipeline

router = APIRouter()

@router.get("/projects")
def list_projects():
    try:
        client = get_bq_client()
        query = f"SELECT pipeline_id, source_type, source_path, final_goal FROM `{BQ_TABLE_ID}`"
        query_job = client.query(query)
        rows = list(query_job.result())
        return [
            {
                "pipeline_id": r.pipeline_id,
                "source_type": r.source_type,
                "source_path": r.source_path,
                "final_goal": r.final_goal
            }
            for r in rows
        ]
    except Exception as e:
        # If DB query fails (e.g. empty or uninitialized table), return empty list
        return []

@router.get("/project/{project_id}")
def get_project(project_id: str):
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
        
    selected_tables = row.selected_tables
    column_context = row.column_context
    feedback_history = row.feedback_history
    relationships = row.relationships
    
    # Load DQ rules from dedicated dq_rules table (grouped by table_name)
    dq_rules_grouped = {}
    try:
        dq_rows = get_dq_rules_by_pipeline(project_id)
        for r in dq_rows:
            t_name = r.table_name
            if t_name not in dq_rules_grouped:
                dq_rules_grouped[t_name] = []
            dq_rules_grouped[t_name].append({
                "pipeline_id": r.pipeline_id,
                "table_name": r.table_name,
                "column_name": r.column_name,
                "referenced_table": r.referenced_table,
                "rule_name": r.rule_name,
                "rule_category": r.rule_category,
                "description": r.description,
                "sql_condition": r.sql_condition,
                "sql_query": r.sql_query,
                "created_at": str(r.created_at) if r.created_at else None
            })
    except Exception:
        pass

    # Load Anomaly rules from dedicated dq_anomaly_registry table
    anoms_grouped = {}
    try:
        from app.adapters.bq_adapter import get_anomaly_rules
        anom_rows = get_anomaly_rules(project_id)
        for r in anom_rows:
            t_name = r["table_name"]
            if t_name not in anoms_grouped:
                anoms_grouped[t_name] = []
            anoms_grouped[t_name].append({
                "table_name": r["table_name"],
                "column_name": r["column_name"],
                "anomaly_name": r["anomaly_name"],
                "anomaly_category": r["anomaly_category"],
                "description": r["description"],
                "sql_condition": r["sql_condition"],
                "compiled_sql": r["sql_query"]
            })
    except Exception as e:
        print(f"Error loading anomalies: {e}")

    return {
        "pipeline_id": row.pipeline_id,
        "source_type": row.source_type,
        "source_path": row.source_path,
        "selected_tables": json.loads(selected_tables) if isinstance(selected_tables, str) else (selected_tables or []),
        "business_context": row.business_context,
        "column_context": json.loads(column_context) if isinstance(column_context, str) else (column_context or {}),
        "final_goal": row.final_goal,
        "generated_doc": row.generated_doc,
        "status": row.status,
        "feedback_history": json.loads(feedback_history) if isinstance(feedback_history, str) else (feedback_history or []),
        "generated_eda": row.generated_eda,
        "relationships": json.loads(relationships) if isinstance(relationships, str) else (relationships or []),
        "erd_mermaid": row.erd_mermaid,
        "suggested_tools": row.suggested_tools,
        "file_formats": json.loads(row.file_formats) if isinstance(row.file_formats, str) and row.file_formats else {},
        "dq_rules": dq_rules_grouped,
        "anomalies": anoms_grouped
    }
