#Requires -Version 5.1
<#
.SYNOPSIS
    Compile et lance TUNISYS ATS entierement en natif (sans Docker) :
    backend Java, microservice IA Python, frontend Angular.
    A lancer APRES install-native-prerequisites.ps1.

.NOTES
    Chaque service tourne dans sa propre fenetre PowerShell (facile a arreter :
    fermez simplement la fenetre correspondante, ou Ctrl+C dedans).
#>

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host ">> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "   OK - $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "   ! $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "   ERREUR - $msg" -ForegroundColor Red }

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  TUNISYS ATS -- Build et lancement natif                   " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

if (-not (Test-Path (Join-Path $projectRoot "backend"))) {
    # le script est peut-etre a la racine du projet directement
    if (Test-Path (Join-Path $scriptDir "backend")) {
        $projectRoot = $scriptDir
    } else {
        Fail "Dossier 'backend' introuvable. Placez ce script a la racine du projet ou dans windows-installer/."
        Read-Host "Appuyez sur Entree pour fermer"
        exit 1
    }
}
Ok "Projet trouve : $projectRoot"

$backendDir  = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"
$iaDir       = Join-Path $projectRoot "ia-service"

# ===================================================================
# 1. BUILD BACKEND (Maven)
# ===================================================================
Step "Compilation du backend Java (peut prendre 2-5 minutes au premier build)..."
Push-Location $backendDir
& mvn -B clean package -DskipTests
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Fail "Le build Maven a echoue. Consultez les messages ci-dessus."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}
Pop-Location
Ok "Backend compile."

# ===================================================================
# 2. INSTALL DEPENDANCES PYTHON (ia-service)
# ===================================================================
Step "Installation des dependances Python (ia-service)..."
Push-Location $iaDir
& python -m venv .venv 2>&1 | Out-Null
& .\.venv\Scripts\pip install --quiet --upgrade pip
& .\.venv\Scripts\pip install --quiet torch --index-url https://download.pytorch.org/whl/cpu
& .\.venv\Scripts\pip install --quiet -r requirements.txt
Pop-Location
Ok "Dependances Python installees."

# ===================================================================
# 3. BUILD FRONTEND (Angular)
# ===================================================================
Step "Installation des dependances npm et build Angular (peut prendre plusieurs minutes)..."
Push-Location $frontendDir
& npm install
& npm run build -- --configuration production
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Fail "Le build Angular a echoue. Consultez les messages ci-dessus."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}
Pop-Location
Ok "Frontend compile."

# Installe "serve" globalement si absent (sert le build Angular en mode SPA)
if (-not (Get-Command serve -ErrorAction SilentlyContinue)) {
    Step "Installation de l'outil 'serve' (npm global)..."
    & npm install -g serve
}

# ===================================================================
# 4. LANCEMENT DES SERVICES (chacun dans sa propre fenetre)
# ===================================================================
Step "Lancement du backend (port 8080)..."
$backendJar = Get-ChildItem -Path (Join-Path $backendDir "target") -Filter "ats-backend.jar" | Select-Object -First 1
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$backendDir'; `$env:SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/tunisys_ats'; `$env:SPRING_DATASOURCE_USERNAME='tunisys'; `$env:SPRING_DATASOURCE_PASSWORD='change_me_postgres'; `$env:IA_SERVICE_URL='http://localhost:8000'; `$env:APP_CORS_ORIGIN='http://localhost:4200'; `$env:JWT_SECRET='change_this_secret_in_production_please_0123456789'; java -jar '$($backendJar.FullName)'"
Ok "Backend lance dans une nouvelle fenetre."

Step "Lancement du microservice IA (port 8000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$iaDir'; `$env:OLLAMA_URL='http://localhost:11434'; `$env:OLLAMA_MODEL='llama3:8b'; .\.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000"
Ok "Microservice IA lance dans une nouvelle fenetre."

Step "Lancement du frontend (port 4200)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$frontendDir'; serve -s dist/tunisys-ats-frontend/browser -l 4200"
Ok "Frontend lance dans une nouvelle fenetre."

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host "  Tous les services demarrent (chacun dans sa fenetre).      " -ForegroundColor Green
Write-Host "  Patientez ~30 secondes que le backend Spring Boot demarre, " -ForegroundColor Green
Write-Host "  puis ouvrez :                                              " -ForegroundColor Green
Write-Host "     http://localhost:4200                                  " -ForegroundColor Green
Write-Host ""
Write-Host "  Compte admin : admin@tunisys.com / Admin@2026              " -ForegroundColor Green
Write-Host "  (le compte est cree automatiquement au premier demarrage   " -ForegroundColor Green
Write-Host "   du backend, via Hibernate ddl-auto=update + les donnees   " -ForegroundColor Green
Write-Host "   de reference -- voir note ci-dessous si absent)           " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pour arreter : fermez simplement les 3 fenetres PowerShell ouvertes." -ForegroundColor DarkGray
Read-Host "Appuyez sur Entree pour fermer cette fenetre (les 3 autres continuent de tourner)"
