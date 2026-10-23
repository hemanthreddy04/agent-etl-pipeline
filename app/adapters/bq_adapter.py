import json
from datetime import datetime
from fastapi import HTTPException
from google.cloud import bigquery
from google.cloud import storage
from app.utils.config import GCP_PROJECT_ID, BQ_TABLE_ID, DQ_RULES_TABLE_ID, BACKUP_TABLE_ID, ANOMALY_TABLE_ID

def get_bq_client():
    try:
        return bigquery.Client(project=GCP_PROJECT_ID)
    except Exception as e:
        raise HTTPException(
            status_code=401, 
            detail=f"Failed to authenticate with GCP BigQuery: {str(e)}"
        )

def get_gcs_client():
    try:
        return storage.Client(project=GCP_PROJECT_ID)
    except Exception as e:
        raise HTTPException(
            status_code=401, 
            detail=f"Failed to authenticate with GCP Cloud Storage: {str(e)}"
        )

def init_db():
    try:
        client = get_bq_client()
        parts = BQ_TABLE_ID.split('.')
        dataset_name = parts[1]
        table_name = parts[2]
        
        dataset_ref = bigquery.DatasetReference(GCP_PROJECT_ID, dataset_name)
        
        # Ensure dataset exists
        try:
            client.get_dataset(dataset_ref)
        except Exception:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "US"
            client.create_dataset(dataset, exists_ok=True)
            
        table_ref = dataset_ref.table(table_name)
        schema = [
            bigquery.SchemaField("pipeline_id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("source_type", "STRING"),
            bigquery.SchemaField("source_path", "STRING"),
            bigquery.SchemaField("selected_tables", "STRING"),
            bigquery.SchemaField("business_context", "STRING"),
            bigquery.SchemaField("column_context", "STRING"),
            bigquery.SchemaField("final_goal", "STRING"),
            bigquery.SchemaField("generated_doc", "STRING"),
            bigquery.SchemaField("status", "STRING"),
            bigquery.SchemaField("feedback_history", "STRING"),
            bigquery.SchemaField("generated_eda", "STRING"),
            bigquery.SchemaField("relationships", "STRING"),
            bigquery.SchemaField("erd_mermaid", "STRING"),
            bigquery.SchemaField("suggested_tools", "STRING"),
            bigquery.SchemaField("dq_rules", "STRING"),
            bigquery.SchemaField("anomalies", "STRING"),
            bigquery.SchemaField("watermark", "STRING"),
        ]
        try:
            table = client.get_table(table_ref)
            existing_names = {field.name for field in table.schema}
            new_fields = []
            for field in schema:
                if field.name not in existing_names:
                    new_fields.append(field)
            if new_fields:
                table.schema = list(table.schema) + new_fields
                client.update_table(table, ["schema"])
        except Exception:
            table = bigquery.Table(table_ref, schema=schema)
            client.create_table(table, exists_ok=True)
    except Exception as e:
        print(f"Failed to initialize BigQuery table: {e}")

def init_dq_rules_table():
    try:
        client = get_bq_client()
        parts = DQ_RULES_TABLE_ID.split('.')
        dataset_name = parts[1]
        table_name = parts[2]
        dataset_ref = bigquery.DatasetReference(GCP_PROJECT_ID, dataset_name)
        try:
            client.get_dataset(dataset_ref)
        except Exception:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "US"
            client.create_dataset(dataset, exists_ok=True)
        table_ref = dataset_ref.table(table_name)
        schema = [
            bigquery.SchemaField("pipeline_id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("table_name", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("column_name", "STRING"),
            bigquery.SchemaField("referenced_table", "STRING"),
            bigquery.SchemaField("rule_name", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("rule_category", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("description", "STRING"),
            bigquery.SchemaField("sql_condition", "STRING"),
            bigquery.SchemaField("sql_query", "STRING"),
            bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
        ]
        try:
            existing_table = client.get_table(table_ref)
            existing_names = {field.name for field in existing_table.schema}
            new_fields = [f for f in schema if f.name not in existing_names]
            if new_fields:
                existing_table.schema = list(existing_table.schema) + new_fields
                client.update_table(existing_table, ["schema"])
        except Exception:
            table = bigquery.Table(table_ref, schema=schema)
            client.create_table(table, exists_ok=True)
    except Exception as e:
        print(f"Failed to initialize DQ rules table: {e}")

def insert_dq_rules(rows: list):
    try:
        client = get_bq_client()
        errors = client.insert_rows_json(DQ_RULES_TABLE_ID, rows)
        if errors:
            raise HTTPException(status_code=500, detail=f"BigQuery insert errors: {errors}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert DQ rules: {str(e)}")

def get_dq_rules_by_pipeline(pipeline_id: str) -> list:
    try:
        client = get_bq_client()
        query = f"""
            SELECT pipeline_id, table_name, column_name, referenced_table,
                   rule_name, rule_category, description, sql_condition, sql_query, created_at
            FROM `{DQ_RULES_TABLE_ID}`
            WHERE pipeline_id = @pipeline_id
            ORDER BY table_name, created_at ASC
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("pipeline_id", "STRING", pipeline_id)]
        )
        query_job = client.query(query, job_config=job_config)
        results = list(query_job.result())
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch DQ rules: {str(e)}")
 
def get_project_by_id(project_id: str):
    try:
        client = get_bq_client()
        query = f"""
            SELECT pipeline_id, source_type, source_path, selected_tables, business_context, column_context, 
                   final_goal, generated_doc, status, feedback_history, generated_eda, relationships, 
                   erd_mermaid, suggested_tools, file_formats, dq_rules, anomalies, watermark
            FROM `{BQ_TABLE_ID}` 
            WHERE pipeline_id = @pipeline_id
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("pipeline_id", "STRING", project_id)
            ]
        )
        query_job = client.query(query, job_config=job_config)
        results = list(query_job.result())
        if not results:
            return None
        return results[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pipeline from BigQuery: {str(e)}")

def save_project_to_bq(pipeline_id: str, data: dict):
    try:
        client = get_bq_client()
        set_clauses = []
        columns = []
        params = [bigquery.ScalarQueryParameter("pipeline_id", "STRING", pipeline_id)]
        
        for key, val in data.items():
            columns.append(key)
            set_clauses.append(f"target.{key} = @{key}")
            # Ensure JSON values are stored as strings
            if isinstance(val, (dict, list)):
                str_val = json.dumps(val)
            else:
                str_val = str(val) if val is not None else None
            params.append(bigquery.ScalarQueryParameter(key, "STRING", str_val))
            
        cols_str = ", ".join(columns)
        vals_str = ", ".join([f"@{col}" for col in columns])
        set_str = ", ".join(set_clauses)
        
        merge_query = f"""
            MERGE `{BQ_TABLE_ID}` target
            USING (SELECT @pipeline_id AS pipeline_id) source
            ON target.pipeline_id = source.pipeline_id
            WHEN MATCHED THEN
              UPDATE SET {set_str}
            WHEN NOT MATCHED THEN
              INSERT (pipeline_id, {cols_str}) VALUES (@pipeline_id, {vals_str})
        """
        job_config = bigquery.QueryJobConfig(query_parameters=params)
        query_job = client.query(merge_query, job_config=job_config)
        query_job.result() # Wait for merge to complete
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save pipeline to BigQuery: {str(e)}")

def init_backup_table():
    try:
        client = get_bq_client()
        parts = BACKUP_TABLE_ID.split('.')
        dataset_name = parts[1]
        table_name = parts[2]
        dataset_ref = bigquery.DatasetReference(GCP_PROJECT_ID, dataset_name)
        try:
            client.get_dataset(dataset_ref)
        except Exception:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "US"
            client.create_dataset(dataset, exists_ok=True)
        table_ref = dataset_ref.table(table_name)
        schema = [
            bigquery.SchemaField("pipeline_id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("run_id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("table_name", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("incremental_column", "STRING"),
            bigquery.SchemaField("start_value", "STRING"),
            bigquery.SchemaField("end_value", "STRING"),
            bigquery.SchemaField("created_at", "TIMESTAMP"),
        ]
        try:
            existing_table = client.get_table(table_ref)
            existing_names = {field.name for field in existing_table.schema}
            new_fields = [f for f in schema if f.name not in existing_names]
            if new_fields:
                existing_table.schema = list(existing_table.schema) + new_fields
                client.update_table(existing_table, ["schema"])
        except Exception:
            table = bigquery.Table(table_ref, schema=schema)
            client.create_table(table, exists_ok=True)
    except Exception as e:
        print(f"Failed to initialize backup table: {e}")

def init_anomaly_table():
    try:
        client = get_bq_client()
        parts = ANOMALY_TABLE_ID.split('.')
        dataset_name = parts[1]
        table_name = parts[2]
        dataset_ref = bigquery.DatasetReference(GCP_PROJECT_ID, dataset_name)
        try:
            client.get_dataset(dataset_ref)
        except Exception:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "US"
            client.create_dataset(dataset, exists_ok=True)
        table_ref = dataset_ref.table(table_name)
        schema = [
            bigquery.SchemaField("pipeline_id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("table_name", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("column_name", "STRING"),
            bigquery.SchemaField("anomaly_name", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("anomaly_category", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("description", "STRING"),
            bigquery.SchemaField("sql_condition", "STRING"),
            bigquery.SchemaField("sql_query", "STRING"),
        ]
        try:
            existing_table = client.get_table(table_ref)
            existing_names = {field.name for field in existing_table.schema}
            new_fields = [f for f in schema if f.name not in existing_names]
            if new_fields:
                existing_table.schema = list(existing_table.schema) + new_fields
                client.update_table(existing_table, ["schema"])
        except Exception:
            table = bigquery.Table(table_ref, schema=schema)
            client.create_table(table, exists_ok=True)
    except Exception as e:
        print(f"Failed to initialize anomaly table: {e}")

def insert_anomaly_rules(rows: list):
    try:
        client = get_bq_client()
        errors = client.insert_rows_json(ANOMALY_TABLE_ID, rows)
        if errors:
            raise HTTPException(status_code=500, detail=f"BigQuery insert errors: {errors}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert anomaly rules: {str(e)}")

def get_backup_records(pipeline_id: str) -> list:
    try:
        client = get_bq_client()
        query = f"""
            SELECT run_id, table_name, incremental_column, start_value, end_value, created_at
            FROM `{BACKUP_TABLE_ID}`
            WHERE pipeline_id = @pipeline_id
            ORDER BY created_at DESC
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("pipeline_id", "STRING", pipeline_id)]
        )
        query_job = client.query(query, job_config=job_config)
        results = list(query_job.result())
        records = []
        for row in results:
            records.append({
                "run_id": row.run_id,
                "table_name": row.table_name,
                "incremental_column": row.incremental_column if hasattr(row, 'incremental_column') else None,
                "start_value": row.start_value,
                "end_value": row.end_value,
                "created_at": row.created_at.isoformat() if hasattr(row, 'created_at') and row.created_at else None
            })
        return records
    except Exception as e:
        print(f"Failed to fetch backup records: {e}")
        return []

def get_latest_backup_scan(pipeline_id: str, table_name: str) -> dict:
    try:
        client = get_bq_client()
        query = f"""
            SELECT start_value, end_value
            FROM `{BACKUP_TABLE_ID}`
            WHERE pipeline_id = @pipeline_id AND table_name = @table_name
            ORDER BY created_at DESC, end_value DESC
            LIMIT 1
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("pipeline_id", "STRING", pipeline_id),
                bigquery.ScalarQueryParameter("table_name", "STRING", table_name),
            ]
        )
        query_job = client.query(query, job_config=job_config)
        results = list(query_job.result())
        if results:
            return {"start_value": results[0].start_value, "end_value": results[0].end_value}
        return None
    except Exception as e:
        print(f"Failed to fetch latest backup scan: {e}")
        return None

def insert_backup_record(pipeline_id: str, run_id: str, table_name: str, start_val: str, end_val: str, incremental_column: str = "N/A"):
    try:
        client = get_bq_client()
        row = {
            "pipeline_id": pipeline_id,
            "run_id": run_id,
            "table_name": table_name,
            "incremental_column": incremental_column,
            "start_value": start_val,
            "end_value": end_val,
            "created_at": datetime.utcnow().isoformat()
        }
        errors = client.insert_rows_json(BACKUP_TABLE_ID, [row])
        if errors:
            raise HTTPException(status_code=500, detail=f"BigQuery backup insert errors: {errors}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert backup record: {str(e)}")

def get_bq_column_type(dataset_name: str, table_name: str, column_name: str) -> str:
    try:
        client = get_bq_client()
        query = f"""
            SELECT data_type
            FROM `{GCP_PROJECT_ID}.{dataset_name}.INFORMATION_SCHEMA.COLUMNS`
            WHERE table_name = @table_name AND column_name = @column_name
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("table_name", "STRING", table_name),
                bigquery.ScalarQueryParameter("column_name", "STRING", column_name)
            ]
        )
        query_job = client.query(query, job_config=job_config)
        results = list(query_job.result())
        if results:
            col_type = results[0]['data_type']
            if 'DATE' in col_type.upper():
                return 'DATE'
            elif 'TIMESTAMP' in col_type.upper():
                return 'TIMESTAMP'
            elif 'STRING' in col_type.upper():
                return 'STRING'
            elif 'INT' in col_type.upper():
                return 'INT64'
            return col_type
        return 'STRING'
    except Exception as e:
        print(f"Failed to fetch column type for {table_name}.{column_name}: {e}")
        return 'STRING'

def get_anomaly_rules(pipeline_id: str) -> list:
    try:
        client = get_bq_client()
        query = f"""
            SELECT table_name, column_name, anomaly_name, anomaly_category, description, sql_condition, sql_query
            FROM `{ANOMALY_TABLE_ID}`
            WHERE pipeline_id = @pipeline_id
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("pipeline_id", "STRING", pipeline_id)]
        )
        query_job = client.query(query, job_config=job_config)
        results = list(query_job.result())
        records = []
        for row in results:
            records.append({
                "table_name": row.table_name,
                "column_name": row.column_name,
                "anomaly_name": row.anomaly_name,
                "anomaly_category": row.anomaly_category,
                "description": row.description,
                "sql_condition": row.sql_condition,
                "sql_query": row.sql_query
            })
        return records
    except Exception as e:
        print(f"Failed to fetch anomaly rules: {e}")
        return []

