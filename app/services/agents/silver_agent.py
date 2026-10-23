import re
from fastapi import HTTPException
from app.services.ai_service import get_genai_client, generate_content_with_retry

def generate_silver_orchestrator(project_id: str, yaml_content: str) -> dict:
    prompt = f"""
    You are an expert Python data engineer.
    The following is a generated YAML configuration for an ETL pipeline for project '{project_id}':
    
    ```yaml
    {yaml_content}
    ```
    
    Write a complete Python script called `silver_processor.py` that handles the transformations from Bronze to Silver.
    
    Requirements:
    1. Import `pandas as pd`, `from google.cloud import bigquery`, and `from google.api_core.exceptions import NotFound`. Import `load_config` from `src.utils.config_loader`. Import `hashlib` for PII hashing. Use `except NotFound:` instead of `except bigquery.exceptions.NotFound:`.
    2. Define a main function `process_silver()`.
    3. Load the configuration: `config = load_config()`.
    4. Initialize a BigQuery client (`client = bigquery.Client(project=config['project_id'])`).
    5. Loop through the tables defined in `config['bronze']['tables']`.
    6. For each table:
       a. Extract `name`, `target_dataset_id`, `target_table_name`, `watermark_column`.
       b. Check if the Silver table already exists.
       c. Get the max watermark from the Silver table.
       d. Query the Bronze table (`config['project_id'].bronze.name`) for rows where `watermark_column` > max watermark (or all rows if no watermark). Use `client.query().to_dataframe()`.
       e. If dataframe is empty, continue to next table.
       f. ALWAYS automatically apply column standardization: convert all column names to lowercase and replace spaces with underscores: `df.columns = df.columns.str.lower().str.replace(' ', '_')`.
       g. ALWAYS automatically drop exact duplicates: `df = df.drop_duplicates()`.
       h. Look for `transformations` in the table config and apply them if they exist:
          - `fill_nulls`: df[cols].fillna(val)
          - `drop_nulls`: df.dropna(subset=cols)
          - `type_casting`: cast cols to `target_type` using `pd.to_datetime` or `pd.to_numeric` safely (`errors='coerce'`)
          - `pii_hashing`: apply a hashlib sha256 hash to the columns if the value is not null. Use a helper function for this.
       i. Add an audit column: `df['silver_processed_timestamp'] = pd.Timestamp.utcnow()`.
       j. Ensure the target dataset exists using `client.create_dataset(f"{{config['project_id']}}.{{table['target_dataset_id']}}", exists_ok=True)`.
       k. Load the cleaned DataFrame into the Silver table using `client.load_table_from_dataframe()`. Initialize a `job_config = bigquery.LoadJobConfig(write_disposition="WRITE_APPEND", autodetect=True)`. Do NOT pass a `schema` argument.
    7. Include an `if __name__ == "__main__":` block to run `process_silver()`.
    
    You MUST output ONLY the raw Python script text. Do NOT wrap it in markdown blockquotes like ```python.
    """
    
    client = get_genai_client()
    raw_response = generate_content_with_retry(
        client=client, 
        model='gemini-2.5-flash', 
        contents=prompt
    ).text or ""
    
    clean_py = re.sub(r"^```[a-zA-Z]*", "", raw_response, flags=re.MULTILINE)
    clean_py = re.sub(r"```$", "", clean_py, flags=re.MULTILINE)
    clean_py = clean_py.strip()
    
    return {"python_code": clean_py}

def generate_silver_pipeline(project_id: str, yaml_content: str) -> dict:
    prompt = f"""
    You are an expert Python data engineer.
    The following is a generated YAML configuration for an ETL pipeline for project '{project_id}':
    
    ```yaml
    {yaml_content}
    ```
    
    Write a complete Python script called `silver_pipeline.py` that orchestrates the data transformation flow from Bronze to Silver.
    
    Requirements:
    1. Import `sys` and `os`. Then, inject the parent directory into `sys.path` exactly like this BEFORE importing `src`:
       ```python
       import os, sys
       sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
       ```
    2. Import `process_silver` from `src.silver.silver_processor`.
    3. Define a main `run_pipeline()` function that:
       - Prints "Starting Silver Layer Pipeline..."
       - Calls `process_silver()` with EXACTLY 0 arguments (since it loads its own config).
       - Prints "Pipeline Complete from bronze to silver" at the end.
    4. Include an `if __name__ == "__main__":` block to execute `run_pipeline()`.
    
    You MUST output ONLY the raw Python script text. Do NOT wrap it in markdown blockquotes like ```python.
    """
    
    client = get_genai_client()
    raw_response = generate_content_with_retry(
        client=client, 
        model='gemini-2.5-flash', 
        contents=prompt
    ).text or ""
    
    clean_py = re.sub(r"^```[a-zA-Z]*", "", raw_response, flags=re.MULTILINE)
    clean_py = re.sub(r"```$", "", clean_py, flags=re.MULTILINE)
    clean_py = clean_py.strip()
    
    return {"python_code": clean_py}

def generate_silver_yaml(project_id: str, existing_yaml: str) -> dict:
    prompt = f"""
    You are an expert Python data engineer.
    The following is an existing YAML configuration for an ETL pipeline for project '{project_id}':
    
    ```yaml
    {existing_yaml}
    ```
    
    Your task is to add a `transformations:` block to EACH table defined under the `bronze:` -> `tables:` list in the YAML.
    
    Requirements:
    1. Look at each table in the `bronze` block.
    2. Add the `transformations` key under each table definition with the following default rules:
       - `column_standardization: true`
       - `drop_duplicates: true`
       - `drop_nulls`: [] (an empty list, unless you can clearly infer a primary key like `id` or `transaction_id`. If a primary key exists, add ONLY the primary key column to `drop_nulls`. Do not add any non-key columns.)
       - `fill_nulls: {{}}` (an empty dictionary, unless you can infer a default value for a column)
       - `type_casting: {{}}` (an empty dictionary, unless you can infer a type cast for a column, e.g., budget to NUMERIC)
       - `pii_hashing: []` (an empty list, unless you see PII columns like email or phone)
    
    3. You MUST output ONLY the updated `bronze:` block (starting with `bronze:`). Do NOT output the `source:`, `dq_rules:`, or `anomalies:` blocks.
    4. You MUST output ONLY the raw YAML text. Do NOT wrap it in markdown blockquotes like ```yaml.
    """
    
    client = get_genai_client()
    raw_response = generate_content_with_retry(
        client=client, 
        model='gemini-2.5-flash', 
        contents=prompt
    ).text or ""
    
    clean_yaml = re.sub(r"^```[a-zA-Z]*", "", raw_response, flags=re.MULTILINE)
    clean_yaml = re.sub(r"```$", "", clean_yaml, flags=re.MULTILINE)
    clean_yaml = clean_yaml.strip()
    
    return {"yaml": clean_yaml}
