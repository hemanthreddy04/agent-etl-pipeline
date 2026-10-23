from google.cloud import storage
from app.utils.config import GCP_PROJECT_ID

def get_gcs_client():
    return storage.Client(project=GCP_PROJECT_ID)

def ensure_gcs_bucket(bucket_name: str):
    client = get_gcs_client()
    try:
        client.get_bucket(bucket_name)
    except Exception:
        try:
            client.create_bucket(bucket_name)
        except Exception as e:
            print(f"Warning: Failed to auto-create bucket '{bucket_name}': {e}")

def upload_gcs_empty_file(bucket_name: str, blob_path: str):
    client = get_gcs_client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    # Upload initial placeholder content
    placeholder = f"# Placeholder for {blob_path}\n"
    blob.upload_from_string(placeholder, content_type="text/plain")

def check_gcs_folder_exists(bucket_name: str, folder_prefix: str) -> bool:
    client = get_gcs_client()
    try:
        bucket = client.get_bucket(bucket_name)
        # Check if there is at least one blob under the folder prefix
        blobs = list(client.list_blobs(bucket, prefix=folder_prefix, max_results=1))
        return len(blobs) > 0
    except Exception:
        return False
