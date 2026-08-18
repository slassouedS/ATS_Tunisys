#Requires -Version 5.1
<#
.SYNOPSIS
    Redeploiement complet en UNE commande, en natif (sans Docker) :
    trouve le dernier zip telecharge, le fusionne avec le projet existant
    (sans toucher node_modules/.venv/target), rebuild backend + frontend,
    arrete les anciens processus, relance les 3 services.

.NOTES
    A utiliser a chaque nouvelle version du projet recue. Lancez-le depuis
    n'importe quel dossier -- il retrouve tout seul le projet et le zip.
    Usage : powershell -ExecutionPolicy Bypass -File .\redeploy-native.ps1
#>

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host ">> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "   OK - $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "   ! $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "   ERREUR - $msg" -ForegroundColor Red }

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  TUNISYS ATS -- Redeploiement complet (natif, sans Docker)  " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# ===================================================================
# 0. LOCALISER LE PROJET EXISTANT
# ===================================================================
$projectRoot = "C:\tunisys-ats"
if (-not (Test-Path (Join-Path $projectRoot "backend"))) {
    Fail "Projet introuvable dans $projectRoot"
    Warn "Modifiez la variable `$projectRoot en haut de ce script si votre projet est ailleurs."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}
Ok "Projet trouve : $projectRoot"

# ===================================================================
# 1. TROUVER LE DERNIER ZIP TELECHARGE
# ===================================================================
Step "Recherche du dernier zip tunisys-ats..."
$searchDirs = @(
    (Join-Path $env:USERPROFILE "Downloads"),
    $PSScriptRoot,
    (Get-Location).Path
) | Select-Object -Unique

$zipFile = $null
foreach ($dir in $searchDirs) {
    if (-not (Test-Path $dir)) { continue }
    $found = Get-ChildItem -Path $dir -Filter "*tunisys*ats*.zip" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($found) { $zipFile = $found; break }
}

if (-not $zipFile) {
    Fail "Aucun fichier tunisys-ats*.zip trouve dans :"
    $searchDirs | ForEach-Object { Warn "   - $_" }
    Warn "Placez le zip telecharge dans votre dossier Telechargements et relancez."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}
Ok "Zip trouve : $($zipFile.FullName) (modifie le $($zipFile.LastWriteTime))"

# ===================================================================
# 2. EXTRAIRE ET FUSIONNER
# ===================================================================
Step "Extraction..."
$extractDir = Join-Path $env:TEMP "tunisys-ats-redeploy"
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipFile.FullName)
try {
    foreach ($entry in $zip.Entries) {
        if ([string]::IsNullOrEmpty($entry.Name) -and $entry.FullName.EndsWith("/")) {
            $dirPath = Join-Path $extractDir ($entry.FullName -replace '/', '\')
            New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
            continue
        }
        $targetPath = Join-Path $extractDir ($entry.FullName -replace '/', '\')
        $targetDir = Split-Path -Parent $targetPath
        if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetPath, $true)
    }
} finally {
    $zip.Dispose()
}
Ok "Extraction terminee."

# Le zip contient un dossier "tunisys-ats" a la racine -- on fusionne son contenu
$sourceDir = Join-Path $extractDir "tunisys-ats"
if (-not (Test-Path $sourceDir)) { $sourceDir = $extractDir }

Step "Fusion avec le projet existant (node_modules/.venv/target preserves)..."
robocopy $sourceDir $projectRoot /E /XD node_modules .venv target /XF nul | Out-Null
Ok "Fusion terminee."

# ===================================================================
# 3. ARRETER LES ANCIENS PROCESSUS (ports 8080, 4200, 8000)
# ===================================================================
Step "Arret des anciens services (ports 8080, 4200, 8000)..."
foreach ($port in @(8080, 4200, 8000)) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            Ok "Processus sur le port $port arrete (PID $($c.OwningProcess))."
        }
    } catch { }
}
Start-Sleep -Seconds 2

# ===================================================================
# 4. REBUILD BACKEND
# ===================================================================
Step "Compilation du backend (Maven)..."
Push-Location (Join-Path $projectRoot "backend")
& mvn -B clean package -DskipTests
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Fail "Le build Maven a echoue."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}
Pop-Location
Ok "Backend compile."

# ===================================================================
# 5. REBUILD FRONTEND
# ===================================================================
Step "Compilation du frontend (Angular)..."
Push-Location (Join-Path $projectRoot "frontend")
& npm run build -- --configuration production
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Fail "Le build Angular a echoue."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}
Pop-Location
Ok "Frontend compile."

# ===================================================================
# 6. RELANCER LES 3 SERVICES
# ===================================================================
$backendDir  = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"
$iaDir       = Join-Path $projectRoot "ia-service"
$backendJar  = Get-ChildItem -Path (Join-Path $backendDir "target") -Filter "ats-backend.jar" | Select-Object -First 1

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
Write-Host "  Redeploiement termine ! Patientez ~20-30s que le backend    " -ForegroundColor Green
Write-Host "  Spring Boot demarre completement, puis ouvrez :             " -ForegroundColor Green
Write-Host "     http://localhost:4200                                   " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Start-Sleep -Seconds 25
Start-Process "http://localhost:4200"

Read-Host "Appuyez sur Entree pour fermer cette fenetre (les 3 autres continuent de tourner)"
