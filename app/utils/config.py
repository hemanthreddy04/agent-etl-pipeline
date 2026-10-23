import os
import json
from pathlib import Path

# Resolve path to config.json
CURRENT_DIR = Path(__file__).parent
CONFIG_PATH = CURRENT_DIR.parent / "config" / "config.json"

# Load default configurations
GCP_PROJECT_ID = "project-423cf945-e1b8-4332-bf5"
BQ_DATASET_ID = "agent_backend_etl"
GCS_CODEBASE_BUCKET = "gs://codebase_etl_pipeline"

if CONFIG_PATH.exists():
    try:
        with open(CONFIG_PATH, "r") as f:
            config_data = json.load(f)
            GCP_PROJECT_ID = config_data.get("GCP_PROJECT_ID", GCP_PROJECT_ID)
            BQ_DATASET_ID = config_data.get("BQ_DATASET_ID", BQ_DATASET_ID)
            GCS_CODEBASE_BUCKET = config_data.get("GCS_CODEBASE_BUCKET", GCS_CODEBASE_BUCKET)
    except Exception as e:
        print(f"Warning: Failed to load config.json: {e}")

# Allow environment variable overrides
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", GCP_PROJECT_ID)
BQ_DATASET_ID = os.getenv("BQ_DATASET_ID", BQ_DATASET_ID)
GCS_CODEBASE_BUCKET = os.getenv("GCS_CODEBASE_BUCKET", GCS_CODEBASE_BUCKET)

# Fetch project ID from Secret Manager using the config host project
try:
    from app.utils.secret_manager import get_project_id_from_secret
    GCP_PROJECT_ID = get_project_id_from_secret(GCP_PROJECT_ID)
except ImportError:
    pass

# Dynamically construct table IDs based on the fetched project ID
BQ_TABLE_ID = f"{GCP_PROJECT_ID}.{BQ_DATASET_ID}.agent_etl_table"
DQ_RULES_TABLE_ID = f"{GCP_PROJECT_ID}.{BQ_DATASET_ID}.dq_rules"
BACKUP_TABLE_ID = f"{GCP_PROJECT_ID}.{BQ_DATASET_ID}.backup"
ANOMALY_TABLE_ID = f"{GCP_PROJECT_ID}.{BQ_DATASET_ID}.anomaly"

