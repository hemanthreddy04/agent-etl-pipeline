import json
import re
from fastapi import HTTPException
from app.services.ai_service import get_genai_client, generate_content_with_retry
from app.adapters.bq_adapter import get_project_by_id

def run_sttm_agent(project_id: str) -> list:
    """
    Calls Gemini to dynamically analyze unstructured metadata and generate a structured STTM.
    """
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
        
    source_type = getattr(row, "source_type", "[]")
    selected_tables = getattr(row, "selected_tables", "{}")
    column_context = getattr(row, "column_context", "{}")
    generated_doc = getattr(row, "generated_doc", "")
    generated_eda = getattr(row, "generated_eda", "")
    relationships = getattr(row, "relationships", "[]")

    prompt = f"""
You are an expert Data Architect. Your task is to generate a comprehensive Source-to-Target Mapping (STTM) configuration for migrating data from the Bronze layer to the Silver layer.

### INPUT CONTEXT:
1. **Source Type**: {source_type}
2. **Selected Tables**: {selected_tables}
3. **Column Context (Descriptions)**: {column_context}
4. **Data Model & Schema Spec**:
{generated_doc}
5. **EDA Keys & Metrics**:
{generated_eda}
6. **Logical Relationships**: {relationships}

### TASK:
Analyze the input contexts and generate a list of mapping rows. For every column in every selected source table, determine its target Silver configuration.
You must output a raw, valid JSON array containing objects matching this schema exactly:

[
  {{
    "source_layer": "bronze",
    "source_table": "raw_source_table_name_bronze",
    "source_column": "raw_source_column_name",
    "target_layer": "silver",
    "target_table": "table_name_silver",
    "target_column": "raw_data_source_column",
    "target_datatype": "STRING | INTEGER | FLOAT | NUMERIC | TIMESTAMP | DATE | BOOLEAN",
    "transformation_rule": "Direct Mapping | Standardize Case | Cast Type | Hash PII | etc.",
    "nullable": "TRUE | FALSE",
    "is_key": "PK | FK |N/A",
    "business_definition": "Business explanation of this column",
    "SCD_type": "Type 1 | Type 2 | N/A",
    "dq_expectation_type": "NOT_NULL | VALUE_RANGE | MATCH_REGEX | N/A",
    "dq_reason": "Explanation of why this DQ rule is enforced"
  }}
]

### INSTRUCTIONS:
- Enforce standard lowercase column names with underscores for target columns.
- Correctly map the types based on the spec (e.g. identify if a column should be a numeric spend, integer count, date, or unique string ID).
- Set `is_key` to "PK" for primary/unique keys and link keys, and "N/A" for non-keys. Non-key columns are nullable ("TRUE"), whereas "PK" columns are non-nullable ("FALSE").
- Define appropriate data quality checks (`dq_expectation_type` and `dq_reason`) based on the column purpose (e.g., keys cannot be null).
- Return ONLY the raw JSON block. Do NOT wrap the JSON in markdown code blocks like ```json.
"""

    try:
        client = get_genai_client()
        raw_response = generate_content_with_retry(
            client=client, 
            model='gemini-2.5-flash',
            contents=prompt,
            config={"response_mime_type": "application/json"}
        ).text or ""
        
        # Parse output securely
        clean_json = re.sub(r"^```[a-zA-Z]*\n", "", raw_response)
        clean_json = re.sub(r"```$", "", clean_json)
        clean_json = clean_json.strip()
        
        sttm_data = json.loads(clean_json)
        if not isinstance(sttm_data, list):
            raise ValueError("STTM Agent did not return a valid list structure.")
            
        return sttm_data
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"AI STTM Agent failed to generate mapping rules: {str(e)}"
        )
