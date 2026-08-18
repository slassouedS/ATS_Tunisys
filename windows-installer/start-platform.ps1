#Requires -Version 5.1
<#
.SYNOPSIS
    Demarre simplement la plateforme TUNISYS ATS deja construite (aucun
    rebuild) : verifie/demarre PostgreSQL et Ollama, puis lance les 3
    services (backend, ia-service, frontend) chacun dans sa fenetre.

.NOTES
    A utiliser apres un redemarrage du serveur (Windows Update, reboot...),
    quand le code n'a pas change et qu'il faut juste tout relancer.
    Usage : powershell -ExecutionPolicy Bypass -File .\start-platform.ps1
#>

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host ">> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "   OK - $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "   ! $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "   ERREUR - $msg" -ForegroundColor Red }

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  TUNISYS ATS -- Demarrage des services                      " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

$projectRoot = "C:\tunisys-ats"
if (-not (Test-Path (Join-Path $projectRoot "backend"))) {
    Fail "Projet introuvable dans $projectRoot"
    Warn "Modifiez la variable `$projectRoot en haut de ce script si votre projet est ailleurs."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}

# ===================================================================
# 1. POSTGRESQL
# ===================================================================
Step "Verification de PostgreSQL..."
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgService) {
    if ($pgService.Status -ne "Running") {
        Start-Service $pgService.Name
        Start-Sleep -Seconds 3
        Ok "PostgreSQL demarre ($($pgService.Name))."
    } else {
        Ok "PostgreSQL deja actif."
    }
} else {
    Warn "Service PostgreSQL introuvable -- verifiez qu'il est bien installe."
}

# ===================================================================
# 2. OLLAMA
# ===================================================================
Step "Verification d'Ollama..."
$ollamaRunning = Get-Process ollama -ErrorAction SilentlyContinue
if (-not $ollamaRunning) {
    Start-Process ollama -ArgumentList "serve" -WindowStyle Minimized
    Start-Sleep -Seconds 5
    Ok "Ollama demarre."
} else {
    Ok "Ollama deja actif."
}

# ===================================================================
# 3. VERIFICATION DES BUILDS EXISTANTS
# ===================================================================
$backendDir  = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"
$iaDir       = Join-Path $projectRoot "ia-service"

$backendJar = Get-ChildItem -Path (Join-Path $backendDir "target") -Filter "ats-backend.jar" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $backendJar) {
    Fail "Aucun ats-backend.jar trouve dans backend\target\ -- le backend n'a jamais ete compile."
    Warn "Lancez d'abord redeploy-native.ps1 (ou compilez manuellement avec mvn clean package)."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}
if (-not (Test-Path (Join-Path $frontendDir "dist\tunisys-ats-frontend\browser"))) {
    Fail "Le frontend n'a jamais ete compile (dossier dist introuvable)."
    Warn "Lancez d'abord redeploy-native.ps1 (ou compilez manuellement avec npm run build)."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}
Ok "Builds backend et frontend trouves."

# ===================================================================
# 4. LANCEMENT DES 3 SERVICES
# ===================================================================
Step "Lancement du backend (port 8080)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$backendDir'; `$env:SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/tunisys_ats'; `$env:SPRING_DATASOURCE_USERNAME='tunisys'; `$env:SPRING_DATASOURCE_PASSWORD='change_me_postgres'; `$env:IA_SERVICE_URL='http://localhost:8000'; `$env:APP_CORS_ORIGIN='http://localhost:4200'; `$env:JWT_SECRET='change_this_secret_in_production_please_0123456789'; java -jar '$($backendJar.FullName)'"
Ok "Backend lance dans une nouvelle fenetre."

Step "Lancement du microservice IA (port 8000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$iaDir'; `$env:OLLAMA_URL='http://localhost:11434'; `$env:OLLAMA_MODEL='llama3.2:3b'; .\.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000"
Ok "Microservice IA lance dans une nouvelle fenetre."

Step "Lancement du frontend (port 4200)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$frontendDir'; serve -s dist/tunisys-ats-frontend/browser -l 4200"
Ok "Frontend lance dans une nouvelle fenetre."

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host "  Demarrage lance ! Patientez ~20-30s que le backend Spring   " -ForegroundColor Green
Write-Host "  Boot demarre completement, puis ouvrez :                   " -ForegroundColor Green
Write-Host "     http://localhost:4200                                   " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Start-Sleep -Seconds 25
Start-Process "http://localhost:4200"

Read-Host "Appuyez sur Entree pour fermer cette fenetre (les 3 autres continuent de tourner)"
