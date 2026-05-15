# Voxentia Control Script for Windows
# Usage: .\voxentia.ps1 <command>

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("install", "up", "down", "test", "docs", "frontend", "backend")]
    $Action
)

$RootPath = Get-Location

switch ($Action) {
    "install" {
        Write-Host "--- Installing Dependencies ---" -ForegroundColor Cyan
        pip install -e core
        pip install -r backend/requirements.txt
        Set-Location frontend
        npm install
        Set-Location $RootPath
        Write-Host "Installation complete!" -ForegroundColor Green
    }
    
    "up" {
        Write-Host "--- Starting Docker Stack ---" -ForegroundColor Cyan
        docker compose up --build
    }
    
    "down" {
        Write-Host "--- Stopping Docker Stack ---" -ForegroundColor Cyan
        docker compose down
    }
    
    "test" {
        Write-Host "--- Running Tests ---" -ForegroundColor Cyan
        pytest tests/
    }
    
    "docs" {
        Write-Host "--- Starting Documentation Server ---" -ForegroundColor Cyan
        mkdocs serve
    }

    "backend" {
        Write-Host "--- Starting Backend Locally ---" -ForegroundColor Cyan
        $env:PYTHONPATH = "core/src;backend;plugins/job_assistant/src;plugins/teacher_assistant/src;plugins/calendar/src"
        python backend/app/main.py
    }

    "frontend" {
        Write-Host "--- Starting Frontend Locally ---" -ForegroundColor Cyan
        Set-Location frontend
        npm run dev
    }
}
