import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.adapters.bq_adapter import init_db, init_dq_rules_table, init_backup_table, init_anomaly_table
from app.api.sources import router as sources_router
from app.api.projects import router as projects_router
from app.api.steps import router as steps_router

import logging

# Filter out static file logging from uvicorn to keep logs clean
class StaticFilter(logging.Filter):
    def filter(self, record):
        log_msg = record.getMessage()
        # Ignore logs for static assets and root HTML loads
        if any(x in log_msg for x in (".js", ".css", "/assets/", "/favicon", ".png", ".svg")) or "GET / " in log_msg:
            return False
        return True

# Apply filter to uvicorn access logger
logging.getLogger("uvicorn.access").addFilter(StaticFilter())

# Initialize BigQuery table schemas
init_db()
init_dq_rules_table()
init_backup_table()
init_anomaly_table()

app = FastAPI(title="Agent ETL/ELT Pipeline Builder Backend - Modular")

# Enable CORS for local development when running separate ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(sources_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(steps_router, prefix="/api")

# Mount React static frontend build if present
static_dist_path = Path(__file__).parent / "static" / "dist"
if static_dist_path.exists():
    app.mount("/", StaticFiles(directory=str(static_dist_path), html=True), name="static")
else:
    print("Warning: app/static/dist not found. Build the frontend using 'npm run build' inside app/static/ to enable unified single-command execution.")

# Helper function exposed for JSON extraction across steps
def extract_json(text: str):
    import re
    import json
    text = re.sub(r"^```[a-zA-Z]*", "", text, flags=re.MULTILINE)
    text = re.sub(r"```$", "", text, flags=re.MULTILINE)
    text = text.strip()
    first_bracket = min((text.find(c) for c in ('{', '[') if text.find(c) != -1), default=-1)
    last_bracket = max((text.rfind(c) for c in ('}', ']') if text.rfind(c) != -1), default=-1)
    if first_bracket != -1 and last_bracket != -1:
        text = text[first_bracket:last_bracket+1]
    return json.loads(text)
