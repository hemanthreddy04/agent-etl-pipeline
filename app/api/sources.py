import io
import csv
import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.adapters.bq_adapter import get_bq_client, get_gcs_client
from app.services.ai_service import get_genai_client, generate_content_with_retry
from app.models.project_models import PreviewRequest

router = APIRouter()

def suggest_descriptions_with_ai(columns: list, business_context: str = "") -> dict:
    try:
        client = get_genai_client()
        context_guideline = f"\nTake into account this general business context/pipeline objective: '{business_context}' to tailor the column descriptions to the target domain.\n" if business_context else ""
        prompt = f"""
        You are a data governance expert. Given these database columns and data types:
        {json.dumps(columns, indent=2)}
        {context_guideline}
        Suggest a professional, enterprise-level business description for each column name.
        Return ONLY a valid JSON object mapping column name to its description, like:
        {{
          "column_name": "Suggested description here..."
        }}
        Do not include markdown tags, code block wraps (like ```json), or any other conversational text.
        """
        response = generate_content_with_retry(
            client=client,
            model='gemini-2.5-flash',
            contents=prompt,
        )
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed for column descriptions: {str(e)}"
        )

@router.get("/sources")
def get_sources(source_type: str):
    if source_type.lower() == "bigquery":
        try:
            client = get_bq_client()
            datasets = list(client.list_datasets())
            return {"datasets": [ds.dataset_id for ds in datasets]}
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"GCP BigQuery authentication failed: {str(e)}. Make sure you are authenticated."
            )
    elif source_type.lower() == "gcs":
        try:
            client = get_gcs_client()
            buckets = list(client.list_buckets())
            return {"buckets": [b.name for b in buckets]}
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"GCP Storage authentication failed: {str(e)}. Make sure you are authenticated."
            )
    else:
        raise HTTPException(status_code=400, detail="Invalid source type")

@router.get("/sources/details")
def get_source_details(source_type: str, path: str):
    if source_type.lower() == "bigquery":
        try:
            client = get_bq_client()
            dataset_ref = client.dataset(path)
            tables = list(client.list_tables(dataset_ref))
            return {"tables": [t.table_id for t in tables]}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to list tables in dataset {path}: {str(e)}")
    elif source_type.lower() == "gcs":
        try:
            client = get_gcs_client()
            bucket = client.bucket(path)
            blobs = list(client.list_blobs(bucket, max_results=100))
            files = [blob.name for blob in blobs if not blob.name.endswith('/')]
            folders = list(set([blob.name.split('/')[0] + '/' for blob in blobs if '/' in blob.name]))
            return {
                "folders": folders,
                "files_by_folder": files
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to list objects in bucket {path}: {str(e)}")
    raise HTTPException(status_code=400, detail="Invalid source type")

@router.post("/preview")
def get_preview(req: PreviewRequest):
    import os
    response = {}
    business_context = req.business_context or ""

    # Normalize inputs to support both single source (strings/lists) and mixed sources (dictionaries)
    items_dict = {}
    path_dict = {}

    if isinstance(req.items, dict):
        items_dict = req.items
    else:
        # Backwards compatibility
        s_type_key = str(req.source_type)
        items_dict = {s_type_key: req.items or []}

    if isinstance(req.path, dict):
        path_dict = req.path
    else:
        # Backwards compatibility
        s_type_key = str(req.source_type)
        path_dict = {s_type_key: req.path}

    for s_type, s_items in items_dict.items():
        if not s_items:
            continue
        curr_path = path_dict.get(s_type, "")

        if s_type.lower() == "bigquery":
            try:
                client = get_bq_client()
                for item in s_items:
                    table_ref = client.dataset(curr_path).table(item)
                    table = client.get_table(table_ref)
                    raw_cols = [{"name": field.name, "type": field.field_type} for field in table.schema]
                    ai_suggestions = suggest_descriptions_with_ai(raw_cols, business_context)
                    
                    schema = []
                    for field in table.schema:
                        desc = field.description or ai_suggestions.get(field.name, f"Logical data field: {field.name}")
                        schema.append({"name": field.name, "type": field.field_type, "description": desc})
                    
                    rows_iter = client.list_rows(table, max_results=5)
                    preview = [dict(row) for row in rows_iter]
                    
                    response[item] = {
                        "schema": schema,
                        "preview": preview,
                        "file_format": "bigquery"
                    }
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to fetch preview from BigQuery: {str(e)}")

        elif s_type.lower() == "gcs":
            try:
                client = get_gcs_client()
                bucket = client.bucket(curr_path)
                for item in s_items:
                    # Auto-detect file format from file extension
                    ext = os.path.splitext(item)[1].lower().lstrip(".")
                    if ext in ("xlsx", "xls"):
                        file_format = "excel"
                    elif ext in ("csv", "parquet", "json"):
                        file_format = ext
                    else:
                        file_format = "csv"  # default fallback
                        
                    import pandas as pd
                    import io
                    import pyarrow as pa
                    import pyarrow.csv as pacsv
                    import pyarrow.parquet as pq
                    import pyarrow.json as pajson
                    
                    try:
                        blob = bucket.blob(item)
                        
                        if file_format == "parquet":
                            buffer = io.BytesIO(blob.download_as_bytes())
                            table = pq.read_table(buffer)
                            pa_schema = table.schema
                            df = table.slice(0, 5).to_pandas()
                        elif file_format == "excel":
                            buffer = io.BytesIO(blob.download_as_bytes())
                            df = pd.read_excel(buffer, nrows=5)
                            table = pa.Table.from_pandas(df)
                            pa_schema = table.schema
                        else:
                            try:
                                chunk = blob.download_as_bytes(start=0, end=1024*1024)
                            except Exception:
                                chunk = blob.download_as_bytes()
                            buffer = io.BytesIO(chunk)
                            
                            if file_format == "json":
                                table = pajson.read_json(buffer)
                            else:
                                table = pacsv.read_csv(buffer)
                            pa_schema = table.schema
                            df = table.slice(0, 5).to_pandas()
                                
                    except Exception as parse_error:
                        print(f"Parse error for {item}: {parse_error}")
                        df = pd.DataFrame()
                        pa_schema = pa.schema([])

                    if df.empty:
                        rows = []
                    else:
                        rows = df.astype(str).replace("nan", "").to_dict(orient="records")
                    
                    def map_pa_type(pa_type):
                        if pa.types.is_integer(pa_type): return "INT64"
                        if pa.types.is_floating(pa_type): return "FLOAT64"
                        if pa.types.is_boolean(pa_type): return "BOOLEAN"
                        if pa.types.is_timestamp(pa_type): return "TIMESTAMP"
                        if pa.types.is_date(pa_type): return "DATE"
                        if pa.types.is_time(pa_type): return "TIME"
                        return "STRING"

                    raw_cols = []
                    for field in pa_schema:
                        if field.name == "__index_level_0__": continue
                        raw_cols.append({"name": field.name, "type": map_pa_type(field.type)})
                        
                    ai_suggestions = suggest_descriptions_with_ai(raw_cols, business_context)
                    schema = [{"name": c["name"], "type": c["type"], "description": ai_suggestions.get(c["name"], f"Logical data field: {c['name']}")} for c in raw_cols]
                    
                    response[item] = {
                        "schema": schema,
                        "preview": rows,
                        "file_format": file_format
                    }
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to fetch preview from Cloud Storage: {str(e)}")

    return response

@router.post("/parse-document")
async def parse_document(file: UploadFile = File(...)):
    filename = file.filename
    content = await file.read()
    mock_text = f"Extracted from {filename}:\n\n"
    if filename.endswith(".pdf"):
        mock_text += "Business Intelligence Standard Guidelines:\n- Customer conversion metrics are defined based on purchases.\n- Include orders with status 'Completed'."
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        mock_text += "Column map references:\n- user_id matches customer_id.\n- revenue metric is sum of total_amount."
    else:
        try:
            mock_text += content.decode("utf-8", errors="ignore")
        except Exception:
            mock_text += "[Binary content]"
    return {"filename": filename, "text": mock_text}
