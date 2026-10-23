import json
from fastapi import HTTPException
from app.services.ai_service import get_genai_client, generate_content_with_retry
from app.adapters.bq_adapter import get_project_by_id
from app.adapters.gcs_adapter import ensure_gcs_bucket, upload_gcs_empty_file
from app.utils.config import GCS_CODEBASE_BUCKET

def run_repo_initializer(project_id: str) -> list:
    row = get_project_by_id(project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    selected_tables = row.selected_tables
    final_goal = row.final_goal

    # Clean codebase bucket name (remove gs:// prefix if present)
    bucket_name = GCS_CODEBASE_BUCKET.replace("gs://", "").strip()

    # Ensure the main bucket exists in GCP
    ensure_gcs_bucket(bucket_name)

    from app.services.ai_service import load_skill_instructions
    base_instructions = load_skill_instructions("repo-agent")

    prompt = f"""
{base_instructions}

### INPUT PROJECT META:
1. Project ID: {project_id}
2. Selected Tables/Files: {selected_tables}
3. Final Target Goal: {final_goal}
"""

    try:
        from app.main import extract_json
    except ImportError:
        def extract_json(text: str):
            import re
            text = re.sub(r"^```[a-zA-Z]*", "", text, flags=re.MULTILINE)
            text = re.sub(r"```$", "", text, flags=re.MULTILINE)
            text = text.strip()
            first_bracket = min((text.find(c) for c in ('{', '[') if text.find(c) != -1), default=-1)
            last_bracket = max((text.rfind(c) for c in ('}', ']') if text.rfind(c) != -1), default=-1)
            if first_bracket != -1 and last_bracket != -1:
                text = text[first_bracket:last_bracket+1]
            return json.loads(text)

    try:
        client = get_genai_client()
        response = generate_content_with_retry(
            client=client,
            model='gemini-2.5-flash',
            contents=prompt,
        )
        file_structure = extract_json(response.text.strip())
        
        created_files = []
        # Upload each file in the structure to the dynamic GCS isolated folder path
        for relative_path, file_content in file_structure.items():
            gcs_blob_path = f"{project_id}_pipeline/{relative_path}"
            # Write empty file to GCS
            upload_gcs_empty_file(bucket_name, gcs_blob_path)
            created_files.append(relative_path)
            
        return created_files
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"GCS Repository structure initialization failed: {str(e)}"
        )
