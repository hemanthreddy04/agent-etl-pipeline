from google.cloud import secretmanager
import os

def get_project_id_from_secret(host_project: str) -> str:
    """
    Fetches the GCP project ID from Secret Manager.
    Assumes the secret is named 'project_id' and resides in the given host_project.
    """
    secret_id = "project_id"
    version_id = "latest"
    
    try:
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{host_project}/secrets/{secret_id}/versions/{version_id}"
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8").strip()
    except Exception as e:
        print(f"Warning: Failed to fetch project_id from Secret Manager: {e}")
        return host_project
