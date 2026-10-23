from fastapi import APIRouter, HTTPException
from app.adapters.bq_adapter import save_project_to_bq, get_project_by_id, insert_dq_rules, get_dq_rules_by_pipeline
from app.models.project_models import (
    PipelineConfig, FeedbackRequest, EDARequest, DeriveRequest,
    ERDRequest, SuggestToolsRequest, SaveToolsRequest,
    InitRepoRequest, SaveConfigRequest
)
from app.services.agents.business_agent import run_business_agent, run_business_refinement
from app.services.agents.eda_agent import run_eda_agent, run_derive_relationships
from app.services.agents.erd_agent import run_erd_agent
from app.services.agents.toolset_agent import run_suggest_tools
from app.services.agents.repo_agent import run_repo_initializer
from app.services.agents.dq_agent import run_suggest_dq_rules

router = APIRouter()

@router.post("/generate-understanding")
def generate_understanding(config: PipelineConfig):
    doc = run_business_agent(
        config_id=config.id,
        source_type=config.source_type,
        source_path=config.source_path,
        selected_tables=config.selected_tables,
        business_context=config.business_context,
        column_context=config.column_context,
        final_goal=config.final_goal,
        schemas=config.schemas,
        feedback_history=config.feedback_history,
        file_formats=config.file_formats
    )
    return {"project_id": config.id, "generated_doc": doc, "status": "pending_approval"}

@router.post("/refine-understanding")
def refine_understanding(req: FeedbackRequest):
    doc = run_business_refinement(req.project_id, req.feedback)
    return {"project_id": req.project_id, "generated_doc": doc, "status": "pending_approval"}

@router.post("/approve-understanding")
def approve_understanding(project_id: str):
    save_project_to_bq(project_id, {"status": "approved"})
    return {"project_id": project_id, "status": "approved"}

@router.post("/generate-eda")
def generate_eda(req: EDARequest):
    doc = run_eda_agent(req.project_id, req.feedback or "", req.existing_eda or "")
    save_project_to_bq(req.project_id, {"generated_eda": doc})
    return {"project_id": req.project_id, "generated_eda": doc}

@router.post("/derive-relationships")
def derive_relationships(req: DeriveRequest):
    relationships = run_derive_relationships(req.project_id, req.feedback or "", req.existing_relationships or "")
    import json
    save_project_to_bq(req.project_id, {"relationships": json.dumps(relationships)})
    return relationships

@router.post("/generate-erd")
def generate_erd(req: ERDRequest):
    relationships = req.relationships
    schemas = req.schemas
    if not relationships or not schemas:
        row = get_project_by_id(req.project_id)
        if row:
            if not relationships and hasattr(row, "relationships") and row.relationships:
                import json
                try:
                    relationships = json.loads(row.relationships)
                except:
                    pass
            if not schemas and hasattr(row, "schemas") and row.schemas:
                import json
                try:
                    schemas = json.loads(row.schemas)
                except:
                    pass

    mermaid = run_erd_agent(
        project_id=req.project_id,
        relationships=relationships,
        feedback=req.feedback or "",
        schemas=schemas,
        eda_context=req.eda_context or "",
        existing_mermaid=req.existing_mermaid or ""
    )
    save_project_to_bq(req.project_id, {"erd_mermaid": mermaid})
    return {"erd_mermaid": mermaid}

@router.post("/suggest-tools")
def suggest_tools(req: SuggestToolsRequest):
    spec = run_suggest_tools(req.project_id, req.current_selections or {}, req.feedback or "")
    save_project_to_bq(req.project_id, {"suggested_tools": spec})
    return {"suggested_tools": spec}

@router.post("/approve-tools")
def approve_tools(project_id: str):
    save_project_to_bq(project_id, {"status": "approved"})
    return {"project_id": project_id, "status": "approved"}


@router.post("/initialize-gcs-repo")
def initialize_gcs_repo(req: InitRepoRequest):
    created_files = run_repo_initializer(req.project_id)
    return {
        "project_id": req.project_id,
        "status": "initialized",
        "created_files": created_files
    }

@router.get("/check-gcs-repo")
def check_gcs_repo(project_id: str):
    from app.adapters.gcs_adapter import check_gcs_folder_exists
    from app.utils.config import GCS_CODEBASE_BUCKET
    
    bucket_name = GCS_CODEBASE_BUCKET.replace("gs://", "").strip()
    folder_prefix = f"{project_id}_pipeline/"
    
    exists = check_gcs_folder_exists(bucket_name, folder_prefix)
    return {
        "project_id": project_id,
        "exists": exists,
        "path": f"gs://{bucket_name}/{folder_prefix}"
    }

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

def compile_sql(table_name: str, rule_name: str, column_name: str, sql_condition: str, project_id: str, dataset_id: str) -> str:
    import re
    bq_table = bq_safe_table_name(table_name)
    fully_qualified = f"`{project_id}.{dataset_id}.{bq_table}`"
    # Replace any unqualified bare table name references inside the condition (e.g. inside EXISTS subqueries)
    # Match FROM or JOIN followed by bare table_name (not already qualified with backticks or dots)
    condition = re.sub(
        rf'\b(FROM|JOIN)\s+(?!`){re.escape(table_name)}\b',
        lambda m: f"{m.group(1)} {fully_qualified}",
        sql_condition,
        flags=re.IGNORECASE
    )

    if 'COUNT(*)' in condition:
        return f"SELECT CURRENT_TIMESTAMP() AS execution_ts, '{table_name}' AS table_name, '{column_name}' AS column_name, '{rule_name}' AS rule_name, COUNT(*) AS total_records, SUM(CASE WHEN cnt > 1 THEN 1 ELSE 0 END) AS failed_records FROM ( SELECT *, COUNT(*) OVER (PARTITION BY {column_name}) as cnt FROM {fully_qualified} )"

    return f"SELECT CURRENT_TIMESTAMP() AS execution_ts, '{table_name}' AS table_name, '{column_name}' AS column_name, '{rule_name}' AS rule_name, COUNT(*) AS total_records, SUM(CASE WHEN {condition} THEN 1 ELSE 0 END) AS failed_records FROM {fully_qualified} AS t1"

@router.post("/generate-dq-rules")
def generate_dq_rules(req: dict):
    project_id = req.get("project_id")
    if not project_id:
        raise HTTPException(status_code=400, detail="Missing project_id")
    return run_suggest_dq_rules(project_id)

@router.post("/save-dq-rules")
def save_dq_rules(req: dict):
    project_id = req.get("project_id")
    dq_rules_input = req.get("dq_rules")
    if not project_id or dq_rules_input is None:
        raise HTTPException(status_code=400, detail="Missing project_id or dq_rules")
    
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.utils.config import GCP_PROJECT_ID
    from datetime import datetime, timezone
    import json
    
    raw_path = row.source_path or "campaign_raw"
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
        dataset_id = "campaign_raw"
        
    if dataset_id.startswith("gs://"):
        dataset_id = "campaign_raw_bronze"

    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    rows_to_insert = []
    for table_name, rules in dq_rules_input.items():
        for rule in rules:
            if rule.get("error"):
                continue
            condition = rule.get("sql_condition", "")
            column_name = rule.get("column_name", "")
            rule_name = rule.get("rule_name", "")
            if not rule_name:
                continue
            description = rule.get("description", "")
            category = rule.get("rule_category", "") or rule.get("category", "TECHNICAL")
            sql_query = compile_sql(
                table_name=table_name,
                rule_name=rule_name,
                column_name=column_name,
                sql_condition=condition,
                project_id=GCP_PROJECT_ID,
                dataset_id=dataset_id
            )
            rows_to_insert.append({
                "pipeline_id": project_id,
                "table_name": table_name,
                "column_name": column_name,
                "referenced_table": rule.get("referenced_table") or None,
                "rule_name": rule_name,
                "rule_category": category,
                "description": description,
                "sql_condition": condition,
                "sql_query": sql_query,
                "created_at": created_at
            })

    if rows_to_insert:
        insert_dq_rules(rows_to_insert)
    return {"status": "saved"}

@router.get("/backup-records")
def backup_records(project_id: str):
    if not project_id:
        raise HTTPException(status_code=400, detail="Missing project_id")
    from app.adapters.bq_adapter import get_backup_records
    return get_backup_records(project_id)

@router.post("/run-backup")
def run_backup(req: dict):
    project_id = req.get("project_id")
    if not project_id:
        raise HTTPException(status_code=400, detail="Missing project_id")
    
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
        
    import json
    raw_path = row.source_path or "campaign_raw"
    dataset_id = ""
    bucket_name = ""
    if isinstance(raw_path, str):
        if raw_path.startswith('{') or raw_path.startswith('['):
            try:
                paths_dict = json.loads(raw_path)
                dataset_id = paths_dict.get("BigQuery", "")
                bucket_name = paths_dict.get("GCS", "")
            except:
                dataset_id = raw_path
        else:
            dataset_id = raw_path
    elif isinstance(raw_path, dict):
        dataset_id = raw_path.get("BigQuery", "")
        bucket_name = raw_path.get("GCS", "")

    if not dataset_id:
        raise HTTPException(status_code=400, detail="Source path (dataset ID) is empty")
        
    import json
    import uuid
    from google.cloud import bigquery
    from app.adapters.bq_adapter import (
        get_bq_client, get_latest_backup_scan, insert_backup_record, get_bq_column_type
    )
    from app.utils.config import GCP_PROJECT_ID
    
    try:
        raw_tables = json.loads(row.selected_tables) if isinstance(row.selected_tables, str) else (row.selected_tables or [])
        tables = []
        table_sources = {}
        if isinstance(raw_tables, list):
            tables = raw_tables
        elif isinstance(raw_tables, dict):
            for source, sublist in raw_tables.items():
                for t in sublist:
                    tables.append(t)
                    table_sources[t] = source
        watermark_map = json.loads(row.watermark) if isinstance(row.watermark, str) else (row.watermark or {})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse project table metadata: {str(e)}")
        
    run_id = f"run_{uuid.uuid4().hex[:8]}"
    results = []
    
    client = get_bq_client()
    from google.cloud import storage
    
    for table_name in tables:
        w_col = watermark_map.get(table_name)
        is_gcs = table_sources.get(table_name) == "GCS"
        
        if is_gcs and bucket_name:
            try:
                storage_client = storage.Client()
                bucket = storage_client.bucket(bucket_name)
                blob = bucket.get_blob(table_name)
                if blob:
                    min_val = None
                    max_val = None
                    actual_w_col = w_col if (w_col and w_col.upper() != "NONE") else None
                    
                    if actual_w_col:
                        try:
                            bq_client = bigquery.Client()
                            job_config = bigquery.QueryJobConfig()
                            
                            # Determine format based on extension
                            ext = table_name.lower().split('.')[-1]
                            fmt = "CSV"
                            if ext in ["json", "jsonl"]: fmt = "NEWLINE_DELIMITED_JSON"
                            elif ext == "parquet": fmt = "PARQUET"
                            
                            external_config = bigquery.ExternalConfig(fmt)
                            external_config.source_uris = [f"gs://{bucket_name}/{table_name}"]
                            if fmt == "CSV":
                                external_config.options.skip_leading_rows = 1
                            external_config.autodetect = True
                            
                            job_config.table_definitions = {"temp_gcs_table": external_config}
                            
                            query = f"SELECT MIN({actual_w_col}) as min_val, MAX({actual_w_col}) as max_val FROM temp_gcs_table"
                            query_job = bq_client.query(query, job_config=job_config)
                            result = list(query_job.result())
                            if result and len(result) > 0:
                                min_val = str(result[0].min_val) if result[0].min_val else "N/A"
                                max_val = str(result[0].max_val) if result[0].max_val else "N/A"
                        except Exception as e:
                            print(f"Error querying GCS via BQ: {e}")
                            
                    if min_val is None or max_val is None:
                        min_val = blob.time_created.strftime("%Y-%m-%d %H:%M:%S") if blob.time_created else "N/A"
                        max_val = blob.updated.strftime("%Y-%m-%d %H:%M:%S") if blob.updated else "N/A"
                        actual_w_col = "FILE_METADATA"
                    
                    latest_scan = get_latest_backup_scan(project_id, table_name)
                    if latest_scan and latest_scan.get("end_value") == max_val:
                        results.append({
                            "table_name": table_name,
                            "status": "skipped",
                            "message": "No new incremental data found"
                        })
                    else:
                        insert_backup_record(project_id, run_id, table_name, min_val, max_val, actual_w_col)
                        results.append({
                            "table_name": table_name,
                            "status": "success",
                            "start_value": min_val,
                            "end_value": max_val
                        })
                else:
                    insert_backup_record(project_id, run_id, table_name, "File Not Found", "File Not Found", w_col if w_col else "NONE")
                    results.append({
                        "table_name": table_name,
                        "status": "skipped",
                        "message": "GCS file not found"
                    })
                continue
            except Exception as e:
                from google.api_core.exceptions import NotFound
                if isinstance(e, NotFound) or "Not found: Table" in str(e):
                    insert_backup_record(project_id, run_id, table_name, "GCS Pending Ingestion", "GCS Pending Ingestion", w_col if w_col else "NONE")
                    results.append({
                        "table_name": table_name,
                        "status": "success",
                        "start_value": "GCS Pending",
                        "end_value": "GCS Pending"
                    })
                else:
                    results.append({
                        "table_name": table_name,
                        "status": "error",
                        "message": f"Execution error: {str(e)}"
                    })
                continue
        
        if not w_col or w_col.upper() == "NONE":
            insert_backup_record(project_id, run_id, table_name, "Full Load", "Full Load", w_col if w_col else "NONE")
            results.append({
                "table_name": table_name,
                "status": "success",
                "start_value": "Full Load",
                "end_value": "Full Load"
            })
            continue
            
        try:
            
            latest_scan = get_latest_backup_scan(project_id, table_name)
            # Safe table name for querying
            bq_table = table_name.replace("/", "_").replace(".", "_")
            col_type = get_bq_column_type(dataset_id, bq_table, w_col)
            
            if latest_scan and latest_scan.get("end_value") and latest_scan.get("end_value") != "Full Load":
                latest_end = latest_scan.get("end_value")
                query = f"""
                    SELECT 
                        MIN(CAST({w_col} AS STRING)) as min_value,
                        MAX(CAST({w_col} AS STRING)) as max_value
                    FROM `{GCP_PROJECT_ID}.{dataset_id}.{bq_table}`
                    WHERE {w_col} > CAST(@latest_end AS {col_type})
                """
                job_config = bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("latest_end", "STRING", latest_end)
                    ]
                )
                query_job = client.query(query, job_config=job_config)
                query_results = list(query_job.result())
            else:
                query = f"""
                    SELECT 
                        MIN(CAST({w_col} AS STRING)) as min_value,
                        MAX(CAST({w_col} AS STRING)) as max_value
                    FROM `{GCP_PROJECT_ID}.{dataset_id}.{bq_table}`
                """
                query_job = client.query(query)
                query_results = list(query_job.result())
                
            if query_results:
                row_res = query_results[0]
                min_val = row_res['min_value']
                max_val = row_res['max_value']
                
                if min_val is not None and max_val is not None:
                    if latest_scan and latest_scan.get("end_value") and str(max_val) == str(latest_scan.get("end_value")):
                        results.append({
                            "table_name": table_name,
                            "status": "skipped",
                            "message": "No new incremental data found"
                        })
                    else:
                        insert_backup_record(project_id, run_id, table_name, str(min_val), str(max_val), w_col)
                        results.append({
                            "table_name": table_name,
                            "status": "success",
                            "start_value": str(min_val),
                            "end_value": str(max_val)
                        })
                else:
                    results.append({
                        "table_name": table_name,
                        "status": "skipped",
                        "message": "No new incremental data found"
                    })
            else:
                results.append({
                    "table_name": table_name,
                    "status": "skipped",
                    "message": "No rows returned from source table"
                })
        except Exception as e:
            results.append({
                "table_name": table_name,
                "status": "error",
                "message": f"Execution error: {str(e)}"
            })
            
    return {"run_id": run_id, "results": results}

@router.post("/generate-anomalies")
def generate_anomalies(req: dict):
    project_id = req.get("project_id")
    if not project_id:
        raise HTTPException(status_code=400, detail="Missing project_id")
    from app.services.agents.anomaly_agent import run_suggest_anomalies
    return run_suggest_anomalies(project_id)

@router.post("/refine-anomalies")
def refine_anomalies(req: dict):
    project_id = req.get("project_id")
    feedback = req.get("feedback", "")
    existing_anomalies = req.get("existing_anomalies", {})
    if not project_id:
        raise HTTPException(status_code=400, detail="Missing project_id")
    if not feedback.strip():
        raise HTTPException(status_code=400, detail="Feedback cannot be empty")
    from app.services.agents.anomaly_agent import run_refine_anomalies
    return run_refine_anomalies(project_id, feedback, existing_anomalies)

@router.post("/refine-dq-rules")
def refine_dq_rules(req: dict):
    project_id = req.get("project_id")
    feedback = req.get("feedback", "")
    existing_rules = req.get("existing_rules", {})
    if not project_id:
        raise HTTPException(status_code=400, detail="Missing project_id")
    if not feedback.strip():
        raise HTTPException(status_code=400, detail="Feedback cannot be empty")
    from app.services.agents.dq_agent import run_refine_dq_rules
    return run_refine_dq_rules(project_id, feedback, existing_rules)

@router.post("/save-anomalies")
def save_anomalies(req: dict):
    project_id = req.get("project_id")
    anomalies_input = req.get("anomalies")
    if not project_id or anomalies_input is None:
        raise HTTPException(status_code=400, detail="Missing project_id or anomalies")
    
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
        
    from app.adapters.bq_adapter import insert_anomaly_rules
    from datetime import datetime
    
    rows_to_insert = []
    
    for table_name, rules in anomalies_input.items():
        for rule in rules:
            rows_to_insert.append({
                "pipeline_id": project_id,
                "table_name": table_name,
                "column_name": rule.get("column_name") or None,
                "anomaly_name": rule.get("anomaly_name"),
                "anomaly_category": rule.get("anomaly_category", "VOLUME"),
                "description": rule.get("description"),
                "sql_condition": rule.get("sql_condition"),
                "sql_query": rule.get("compiled_sql")
            })
            
    if rows_to_insert:
        insert_anomaly_rules(rows_to_insert)
    return {"status": "saved"}

@router.post("/execute-anomalies")
def execute_anomalies(req: dict):
    project_id = req.get("project_id")
    if not project_id:
        raise HTTPException(status_code=400, detail="Missing project_id")
        
    from app.adapters.bq_adapter import get_anomaly_rules, get_bq_client, BACKUP_TABLE_ID
    from google.cloud import bigquery
    
    rules = get_anomaly_rules(project_id)
    if not rules:
        return {"status": "success", "results": [], "message": "No registered anomalies found"}
        
    client = get_bq_client()
    results = []
    
    scans_cache = {}
    
    for rule in rules:
        table_name = rule["table_name"]
        
        if table_name not in scans_cache:
            scan_query = f"""
                SELECT start_value, end_value
                FROM `{BACKUP_TABLE_ID}`
                WHERE pipeline_id = @pipeline_id AND table_name = @table_name
                ORDER BY created_at DESC, end_value DESC
                LIMIT 2
            """
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("pipeline_id", "STRING", project_id),
                    bigquery.ScalarQueryParameter("table_name", "STRING", table_name),
                ]
            )
            scans_cache[table_name] = list(client.query(scan_query, job_config=job_config).result())
            
        scans = scans_cache[table_name]
        
        if len(scans) < 2:
            results.append({
                "table_name": table_name,
                "anomaly_name": rule["anomaly_name"],
                "status": "skipped",
                "message": "Not enough incremental run history (requires at least 2 runs)"
            })
            continue
            
        curr_start = scans[0].start_value
        curr_end = scans[0].end_value
        prev_start = scans[1].start_value
        prev_end = scans[1].end_value
        
        sql = rule["sql_query"]
        sql = sql.replace("{previous_start}", prev_start)
        sql = sql.replace("{previous_end}", prev_end)
        sql = sql.replace("{current_start}", curr_start)
        sql = sql.replace("{current_end}", curr_end)
        

        
        try:
            query_job = client.query(sql)
            query_results = list(query_job.result())
            if query_results:
                row = query_results[0]
                results.append({
                    "table_name": table_name,
                    "anomaly_name": rule["anomaly_name"],
                    "status": "executed",
                    "previous_records_count": row.get("previous_records_count"),
                    "current_records_count": row.get("current_records_count"),
                    "previous_value": row.get("previous_value"),
                    "current_value": row.get("current_value"),
                    "absolute_diff": row.get("absolute_diff"),
                    "change_pct": row.get("change_pct")
                })
            else:
                results.append({
                    "table_name": table_name,
                    "anomaly_name": rule["anomaly_name"],
                    "status": "no_data",
                    "message": "Comparison query returned no results"
                })
        except Exception as e:
            results.append({
                "table_name": table_name,
                "anomaly_name": rule["anomaly_name"],
                "status": "error",
                "message": f"Query execution failed: {str(e)}"
            })
            
    return {"results": results}
from app.services.agents.bronze_agent import run_bronze_agent, generate_config_loader, generate_file_reader, generate_bronze_orchestrator, generate_dq_executor, generate_bronze_pipeline
from google.cloud import storage
import yaml
from pydantic import BaseModel

def fetch_code_from_gcs(project_id: str, path_suffix: str) -> str:
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket("codebase_etl_pipeline")
        blob_path = f"{project_id}_pipeline/{path_suffix}"
        blob = bucket.blob(blob_path)
        if blob.exists():
            return blob.download_as_string().decode("utf-8")
        return ""
    except Exception as e:
        print(f"Error fetching {path_suffix} from GCS: {e}")
        return ""

class ConfigLoaderRequest(BaseModel):
    project_id: str
    yaml_content: str

class SaveLoaderRequest(BaseModel):
    project_id: str
    python_code: str

@router.get("/generate-bronze-yaml")
def generate_bronze_yaml(project_id: str):
    res = run_bronze_agent(project_id)
    if "src.zip" in res:
        del res["src.zip"]
    return res

@router.post("/generate-config-loader")
def generate_config_loader_api(req: ConfigLoaderRequest):
    try:
        py_res = generate_config_loader(req.project_id, req.yaml_content)
        return {"status": "success", "python_code": py_res.get("python_code", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-loader-to-gcs")
def save_loader_to_gcs(req: SaveLoaderRequest):
    try:
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        blob_path = f"{req.project_id}_pipeline/src/utils/config_loader.py"
        blob = bucket.blob(blob_path)
        
        blob.upload_from_string(req.python_code)
        
        return {"status": "success", "message": "Loader script saved to GCS."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-config-to-gcs")
def save_config_to_gcs(req: SaveConfigRequest):
    try:
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        blob_path = f"{req.project_id}_pipeline/config/config.yaml"
        blob = bucket.blob(blob_path)
        
        # Load new content from frontend
        new_content = yaml.safe_load(req.yaml_content)
        if not isinstance(new_content, dict):
            new_content = {}
            
        existing_content = {}
        if blob.exists():
            existing_yaml_str = blob.download_as_string().decode("utf-8")
            existing_content = yaml.safe_load(existing_yaml_str) or {}
            
        # Merge properties
        for key, value in new_content.items():
            existing_content[key] = value
            
        # Add a custom representer to force block scalar (|) format for multi-line SQL
        class literal_str(str): pass
        def literal_representer(dumper, data):
            return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')
        yaml.add_representer(literal_str, literal_representer)

        def convert_multiline_strings(obj):
            if isinstance(obj, dict):
                return {k: convert_multiline_strings(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_multiline_strings(i) for i in obj]
            elif isinstance(obj, str) and '\n' in obj:
                return literal_str(obj)
            return obj

        # Dump back to string and upload
        formatted_content = convert_multiline_strings(existing_content)
        merged_yaml_str = yaml.dump(formatted_content, sort_keys=False)
        blob.upload_from_string(merged_yaml_str)
        
        return {"status": "success", "message": "Configuration saved to GCS."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FileReaderRequest(BaseModel):
    project_id: str
    yaml_content: str

class SaveReaderRequest(BaseModel):
    project_id: str
    python_code: str

@router.post("/generate-file-reader")
def generate_file_reader_api(req: FileReaderRequest):
    try:
        config_loader_code = fetch_code_from_gcs(req.project_id, "src/utils/config_loader.py")
        py_res = generate_file_reader(req.project_id, req.yaml_content, config_loader_code)
        return {"status": "success", "python_code": py_res.get("python_code", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-reader-to-gcs")
def save_reader_to_gcs(req: SaveReaderRequest):
    try:
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        blob_path = f"{req.project_id}_pipeline/src/readers/file_reader.py"
        blob = bucket.blob(blob_path)
        
        blob.upload_from_string(req.python_code)
        
        return {"status": "success", "message": "Reader script saved to GCS."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class BronzeOrchestratorRequest(BaseModel):
    project_id: str
    yaml_content: str

class SaveBronzeOrchestratorRequest(BaseModel):
    project_id: str
    python_code: str

@router.post("/generate-bronze-orchestrator")
def generate_bronze_orchestrator_api(req: BronzeOrchestratorRequest):
    try:
        file_reader_code = fetch_code_from_gcs(req.project_id, "src/readers/file_reader.py")
        alert_code = fetch_code_from_gcs(req.project_id, "src/utils/alert.py")
        py_res = generate_bronze_orchestrator(req.project_id, req.yaml_content, file_reader_code, alert_code)
        return {"status": "success", "python_code": py_res.get("python_code", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-bronze-orchestrator-to-gcs")
def save_bronze_orchestrator_to_gcs(req: SaveBronzeOrchestratorRequest):
    try:
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        blob_path = f"{req.project_id}_pipeline/src/bronze/bronze_processor.py"
        blob = bucket.blob(blob_path)
        
        blob.upload_from_string(req.python_code)
        
        return {"status": "success", "message": "Bronze Orchestrator script saved to GCS."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DQExecutorRequest(BaseModel):
    project_id: str
    yaml_content: str

class SaveDQExecutorRequest(BaseModel):
    project_id: str
    python_code: str

@router.post("/generate-dq-executor")
def generate_dq_executor_api(req: DQExecutorRequest):
    try:
        bronze_processor_code = fetch_code_from_gcs(req.project_id, "src/bronze/bronze_processor.py")
        py_res = generate_dq_executor(req.project_id, req.yaml_content, bronze_processor_code)
        return {"status": "success", "python_code": py_res.get("python_code", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-dq-executor-to-gcs")
def save_dq_executor_to_gcs(req: SaveDQExecutorRequest):
    try:
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        blob_path = f"{req.project_id}_pipeline/src/bronze/dq_executor.py"
        blob = bucket.blob(blob_path)
        
        blob.upload_from_string(req.python_code)
        
        return {"status": "success", "message": "DQ Executor script saved to GCS."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class BronzePipelineRequest(BaseModel):
    project_id: str
    yaml_content: str

class SaveBronzePipelineRequest(BaseModel):
    project_id: str
    python_code: str

@router.post("/generate-bronze-pipeline")
def generate_bronze_pipeline_api(req: BronzePipelineRequest):
    try:
        bronze_processor_code = fetch_code_from_gcs(req.project_id, "src/bronze/bronze_processor.py")
        dq_executor_code = fetch_code_from_gcs(req.project_id, "src/bronze/dq_executor.py")
        py_res = generate_bronze_pipeline(req.project_id, req.yaml_content, bronze_processor_code, dq_executor_code)
        return {"status": "success", "python_code": py_res.get("python_code", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-bronze-pipeline-to-gcs")
def save_bronze_pipeline_to_gcs(req: SaveBronzePipelineRequest):
    try:
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        blob_path = f"{req.project_id}_pipeline/pipelines/bronze_pipeline.py"
        blob = bucket.blob(blob_path)
        
        blob.upload_from_string(req.python_code)
        
        return {"status": "success", "message": "Bronze Pipeline script saved to GCS."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fetch-bronze-artifacts")
def fetch_bronze_artifacts(project_id: str):
    try:
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        artifacts = {
            "yaml_config": f"{project_id}_pipeline/config/config.yaml",
            "loader_code": f"{project_id}_pipeline/src/utils/config_loader.py",
            "reader_code": f"{project_id}_pipeline/src/readers/file_reader.py",
            "orchestrator_code": f"{project_id}_pipeline/src/bronze/bronze_processor.py",
            "dq_executor_code": f"{project_id}_pipeline/src/bronze/dq_executor.py",
            "pipeline_code": f"{project_id}_pipeline/pipelines/bronze_pipeline.py",
            "requirements_code": f"{project_id}_pipeline/requirements.txt",
            "alert_code": f"{project_id}_pipeline/src/utils/alert.py"
        }
        
        result = {}
        for key, path in artifacts.items():
            blob = bucket.blob(path)
            if blob.exists():
                result[key] = blob.download_as_text()
            else:
                result[key] = f"# Placeholder for {path}"
                
        return {"status": "success", "artifacts": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fetch-silver-artifacts")
def fetch_silver_artifacts(project_id: str):
    try:
        from google.cloud import storage
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        artifacts = {
            "yaml_config": f"{project_id}_pipeline/config/config.yaml",
            "orchestrator_code": f"{project_id}_pipeline/src/silver/silver_processor.py",
            "pipeline_code": f"{project_id}_pipeline/pipelines/silver_pipeline.py"
        }
        
        result = {}
        for key, path in artifacts.items():
            blob = bucket.blob(path)
            if blob.exists():
                result[key] = blob.download_as_text()
            else:
                result[key] = None
                
        return {"status": "success", "artifacts": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class GenerateRequirementsRequest(BaseModel):
    project_id: str

@router.post("/generate-requirements")
def generate_requirements_endpoint(req: GenerateRequirementsRequest):
    try:
        requirements_content = """pandas
google-cloud-bigquery
google-cloud-storage
pyyaml
pyarrow
db-dtypes
pandas-gbq
gcsfs
google-api-core
pytz"""
        
        return {"status": "success", "requirements_code": requirements_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SaveRequirementsRequest(BaseModel):
    project_id: str
    requirements_code: str

@router.post("/save-requirements-to-gcs")
def save_requirements_to_gcs(req: SaveRequirementsRequest):
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket("codebase_etl_pipeline")
        
        blob_path = f"{req.project_id}_pipeline/requirements.txt"
        blob = bucket.blob(blob_path)
        blob.upload_from_string(req.requirements_code)
        
        return {"status": "success", "gcs_path": f"gs://codebase_etl_pipeline/{blob_path}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GenerateBronzeConfigRequest(BaseModel):
    project_id: str
    yaml_content: str

@router.post("/generate-bronze-config")
def generate_bronze_config_endpoint(req: GenerateBronzeConfigRequest):
    try:
        from app.services.agents.bronze_agent import generate_bronze_config
        yaml_res = generate_bronze_config(req.project_id, req.yaml_content)
        return {"status": "success", "yaml": yaml_res.get("yaml", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SilverOrchestratorRequest(BaseModel):
    project_id: str
    yaml_content: str

class SaveSilverOrchestratorRequest(BaseModel):
    project_id: str
    python_code: str

@router.post("/generate-silver-orchestrator")
def generate_silver_orchestrator_api(req: SilverOrchestratorRequest):
    try:
        from app.services.agents.silver_agent import generate_silver_orchestrator
        py_res = generate_silver_orchestrator(req.project_id, req.yaml_content)
        return {"status": "success", "python_code": py_res.get("python_code", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-silver-orchestrator-to-gcs")
def save_silver_orchestrator_to_gcs(req: SaveSilverOrchestratorRequest):
    try:
        from google.cloud import storage
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        blob_path = f"{req.project_id}_pipeline/src/silver/silver_processor.py"
        blob = bucket.blob(blob_path)
        
        blob.upload_from_string(req.python_code)
        
        return {"status": "success", "message": "Silver Orchestrator script saved to GCS."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SilverPipelineRequest(BaseModel):
    project_id: str
    yaml_content: str

class SaveSilverPipelineRequest(BaseModel):
    project_id: str
    python_code: str

@router.post("/generate-silver-pipeline")
def generate_silver_pipeline_api(req: SilverPipelineRequest):
    try:
        from app.services.agents.silver_agent import generate_silver_pipeline
        py_res = generate_silver_pipeline(req.project_id, req.yaml_content)
        return {"status": "success", "python_code": py_res.get("python_code", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-silver-pipeline-to-gcs")
def save_silver_pipeline_to_gcs(req: SaveSilverPipelineRequest):
    try:
        from google.cloud import storage
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        blob_path = f"{req.project_id}_pipeline/pipelines/silver_pipeline.py"
        blob = bucket.blob(blob_path)
        
        blob.upload_from_string(req.python_code)
        
        return {"status": "success", "message": "Silver Pipeline script saved to GCS."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SilverYamlRequest(BaseModel):
    project_id: str
    yaml_content: str

@router.post("/generate-silver-yaml")
def generate_silver_yaml_api(req: SilverYamlRequest):
    try:
        from app.services.agents.silver_agent import generate_silver_yaml
        yaml_res = generate_silver_yaml(req.project_id, req.yaml_content)
        return {"status": "success", "yaml": yaml_res.get("yaml", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AlertModuleRequest(BaseModel):
    project_id: str
    yaml_content: str

class SaveAlertModuleRequest(BaseModel):
    project_id: str
    python_code: str

@router.post("/generate-alert-module")
def generate_alert_module_api(req: AlertModuleRequest):
    try:
        from app.services.agents.bronze_agent import generate_alert_module
        py_res = generate_alert_module(req.project_id, req.yaml_content)
        return {"status": "success", "python_code": py_res.get("python_code", "")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-alert-module-to-gcs")
def save_alert_module_to_gcs(req: SaveAlertModuleRequest):
    try:
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        blob_path = f"{req.project_id}_pipeline/src/utils/alert.py"
        blob = bucket.blob(blob_path)
        
        blob.upload_from_string(req.python_code)
        
        return {"status": "success", "message": "Alert Module script saved to GCS."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SaveBronzeAllRequest(BaseModel):
    project_id: str
    files: dict

@router.post("/save-bronze-all-to-gcs")
def save_bronze_all_to_gcs(req: SaveBronzeAllRequest):
    try:
        storage_client = storage.Client()
        bucket_name = "codebase_etl_pipeline"
        bucket = storage_client.bucket(bucket_name)
        
        with open("debug_keys.txt", "w") as f:
            f.write(str(req.files.keys()))
            
        # Force delete legacy src.zip from GCS just in case it was uploaded
        try:
            zip_blob = bucket.blob(f"{req.project_id}_pipeline/src.zip")
            if zip_blob.exists():
                zip_blob.delete()
        except Exception:
            pass
            
        for file_path, content in req.files.items():
            # Drop the zip file if it's sent by a stale frontend state
            if file_path == "src.zip":
                continue
                
            if content:
                blob_path = f"{req.project_id}_pipeline/{file_path}"
                blob = bucket.blob(blob_path)
                blob.upload_from_string(content)

        return {"status": "success", "message": "All Bronze Pipeline scripts saved to GCS."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sttm/generate")
def generate_sttm_endpoint(project_id: str):
    from app.services.agents.sttm_agent import run_sttm_agent
    try:
        data = run_sttm_agent(project_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class STTMDownloadRequest(BaseModel):
    rows: list

@router.post("/sttm/download")
def download_sttm_endpoint(req: STTMDownloadRequest):
    import io
    import pandas as pd
    from fastapi.responses import StreamingResponse
    
    try:
        df = pd.DataFrame(req.rows)
        # Rename columns to look pretty in Excel
        column_mapping = {
            "source_layer": "Source Layer",
            "source_table": "Source Table",
            "source_column": "Source Column",
            "target_layer": "Target Layer",
            "target_table": "Target Table",
            "target_column": "Target Column",
            "target_datatype": "Target Datatype",
            "transformation_rule": "Transformation Rule",
            "nullable": "Nullable",
            "is_key": "Is Key",
            "business_definition": "Business Definition (Columns)",
            "SCD_type": "SCD Type",
            "dq_expectation_type": "DQ Expectation Type",
            "dq_reason": "DQ Reason"
        }
        df.rename(columns=column_mapping, inplace=True)
        
        # Ensure correct column order matching Excel screenshot
        desired_order = [
            "Source Layer", "Source Table", "Source Column",
            "Target Layer", "Target Table", "Target Column", "Target Datatype",
            "Transformation Rule", "Nullable", "Is Key", "Business Definition (Columns)",
            "SCD Type", "DQ Expectation Type", "DQ Reason"
        ]
        # Reindex to ensure exactly those columns exist in order
        existing_cols = [c for c in desired_order if c in df.columns]
        df = df[existing_cols]

        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='STTM')
        buffer.seek(0)
        
        headers = {
            'Content-Disposition': 'attachment; filename="sttm_bronze_to_silver.xlsx"'
        }
        return StreamingResponse(
            buffer,
            headers=headers,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

