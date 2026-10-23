# Agent ETL/ELT Pipeline Startup Script

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "⚡ Initializing Agentic ETL Pipeline App ⚡" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Setup Backend
Write-Host "`n[1/3] Preparing Python Backend..." -ForegroundColor Yellow
cd "$PSScriptRoot"

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Gray
    python -m venv venv
}

Write-Host "Installing backend dependencies (FastAPI, GCP clients, Gemini)..." -ForegroundColor Gray
.\venv\Scripts\pip install fastapi uvicorn pydantic uvicorn[standard] python-multipart
.\venv\Scripts\pip install google-cloud-bigquery google-cloud-storage google-genai --quiet

# 2. Setup Frontend
Write-Host "`n[2/3] Preparing React Frontend..." -ForegroundColor Yellow
cd "$PSScriptRoot\app\static"
Write-Host "Installing npm dependencies (Vite, React, Tailwind, Lucide)..." -ForegroundColor Gray
npm install

# 3. Launch instructions
Write-Host "`n[3/3] Ready to Launch!" -ForegroundColor Green
Write-Host "To start the application, run the following two commands in separate terminal sessions:" -ForegroundColor White

Write-Host "`n--- TERMINAL 1 (Backend FastAPI) ---" -ForegroundColor Cyan
Write-Host "cd '$PSScriptRoot'" -ForegroundColor Gray
Write-Host ".\venv\Scripts\python -m uvicorn app.main:app --reload --port 8000" -ForegroundColor Yellow

Write-Host "`n--- TERMINAL 2 (Frontend React/Vite) ---" -ForegroundColor Cyan
Write-Host "cd '$PSScriptRoot\app\static'" -ForegroundColor Gray
Write-Host "npm run dev" -ForegroundColor Yellow

Write-Host "`nOnce both are running, open your browser at: http://localhost:3000`n" -ForegroundColor Green
