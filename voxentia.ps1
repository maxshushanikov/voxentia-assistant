# Voxentia Control Script for Windows
# Usage: .\voxentia.ps1 <command>
# Enhanced with professional build process and validation

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("install", "up", "down", "test", "docs", "frontend", "backend", "build")]
    $Action
)

$RootPath = Get-Location
$ErrorActionPreference = "Stop"

# Colors for output
$InfoColor = "Cyan"
$SuccessColor = "Green"
$ErrorColor = "Red"
$WarningColor = "Yellow"

function Write-Info { Write-Host "$args" -ForegroundColor $InfoColor }
function Write-Success { Write-Host "$args" -ForegroundColor $SuccessColor }
function Write-Error-Custom { Write-Host "$args" -ForegroundColor $ErrorColor }
function Write-Warning { Write-Host "$args" -ForegroundColor $WarningColor }

function Test-FrontendDependencies {
    $frontendDir = "frontend"
    
    if (-not (Test-Path "$frontendDir/node_modules")) {
        Write-Warning "❌ node_modules nicht gefunden!"
        Write-Info "📦 Installiere npm-Abhängigkeiten..."
        
        Set-Location $frontendDir
        npm ci --legacy-peer-deps --no-audit --no-fund 2>&1 | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "❌ npm install fehlgeschlagen (Exit Code: $LASTEXITCODE)"
            Set-Location $RootPath
            exit 1
        }
        
        Write-Success "✓ npm install erfolgreich"
        Set-Location $RootPath
        return $true
    }
    
    Write-Success "✓ node_modules vorhanden"
    return $false
}

function Build-Frontend {
    Write-Info "🏗️  Baue Frontend..."
    Set-Location "frontend"
    
    npm run build 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "⚠️  Frontend-Build fehlgeschlagen, räume auf und versuche erneut..."
        Write-Info "🗑️  Lösche node_modules..."
        Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
        
        Write-Info "📦 Installiere npm-Abhängigkeiten neu..."
        npm ci --legacy-peer-deps --no-audit --no-fund
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "❌ npm install fehlgeschlagen"
            Set-Location $RootPath
            exit 1
        }
        
        Write-Info "🔄 Versuche Frontend-Build erneut..."
        npm run build 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "❌ Frontend-Build fehlgeschlagen"
            Set-Location $RootPath
            exit 1
        }
    }
    
    Write-Success "✓ Frontend-Build erfolgreich"
    Set-Location $RootPath
}

function Check-Docker {
    Write-Info "🐳 Prüfe Docker..."
    try {
        docker --version | Out-Null
        Write-Success "✓ Docker verfügbar"
    } catch {
        Write-Error-Custom "❌ Docker nicht gefunden! Bitte Docker Desktop installieren."
        exit 1
    }
}

function Check-Prerequisites {
    Write-Info "🔍 Prüfe Voraussetzungen..."
    
    # Docker prüfen
    Check-Docker
    
    # Node/npm prüfen
    Write-Info "🟢 Prüfe Node.js..."
    try {
        npm --version | Out-Null
        Write-Success "✓ npm verfügbar"
    } catch {
        Write-Error-Custom "❌ npm nicht gefunden! Bitte Node.js installieren."
        exit 1
    }
}

switch ($Action) {
    "install" {
        Write-Info "--- Installiere Abhängigkeiten ---"
        Check-Prerequisites
        
        Write-Info "📥 Installiere Python-Abhängigkeiten..."
        pip install -e core
        pip install -r backend/requirements.txt
        pip install -r requirements-dev.txt
        
        Write-Info "📥 Installiere Frontend-Abhängigkeiten..."
        Set-Location frontend
        npm ci --legacy-peer-deps --no-audit --no-fund
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "❌ npm install fehlgeschlagen"
            Set-Location $RootPath
            exit 1
        }
        
        Set-Location $RootPath
        Write-Success "✓ Installation erfolgreich!"
    }
    
    "build" {
        Write-Info "--- Frontend-Build ---"
        Check-Prerequisites
        Test-FrontendDependencies
        Build-Frontend
        Write-Success "✓ Build erfolgreich!"
    }
    
    "up" {
        Write-Info "--- Starte Docker Stack ---"
        Check-Prerequisites
        
        # Frontend vorbereiten
        Write-Info "`n📦 Prüfe Frontend..."
        $DepInstalled = Test-FrontendDependencies
        
        if ($DepInstalled -or -not (Test-Path "frontend/dist")) {
            Build-Frontend
        } else {
            Write-Success "✓ Frontend ist aktuell"
        }
        
        Write-Info "`n🚀 Starte Docker Compose..."
        docker compose up --build
    }
    
    "down" {
        Write-Info "--- Stoppe Docker Stack ---"
        docker compose down
        Write-Success "✓ Gestoppt"
    }
    
    "test" {
        Write-Info "--- Führe Tests aus ---"
        pytest tests/
    }
    
    "docs" {
        Write-Info "--- Starte Dokumentation (http://localhost:8000) ---"
        mkdocs serve
    }

    "backend" {
        Write-Info "--- Starte Backend lokal ---"
        Check-Prerequisites
        $env:PYTHONPATH = "core/src;backend;plugins/job_assistant/src;plugins/teacher_assistant/src;plugins/calendar/src"
        python backend/app/main.py
    }

    "frontend" {
        Write-Info "--- Starte Frontend lokal ---"
        Check-Prerequisites
        Test-FrontendDependencies
        Set-Location frontend
        npm run dev
    }
}
