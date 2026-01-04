# backend/dev.ps1

# 1. Path to Python (Now it is just a neighbor folder)
$python = ".\.venv\Scripts\python.exe"

# 2. Check if Venv exists
if (-not (Test-Path $python)) {
    Write-Error "❌ .venv not found! Run: python -m venv .venv"
    exit
}

# 3. Run Uvicorn
# We use 'app.main:app' because the folder 'app' is right here.
Write-Host "🚀 Starting Brain..." -ForegroundColor Cyan
& $python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000