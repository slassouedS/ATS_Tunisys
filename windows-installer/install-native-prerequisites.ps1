#Requires -Version 5.1
<#
.SYNOPSIS
    Installe TOUS les prerequis pour deployer TUNISYS ATS SANS Docker :
    Java 21 (JDK), Maven, Node.js 22, Python 3.11, PostgreSQL, Ollama (LLM on-premise).
    Cree la base de donnees Postgres et telecharge le modele LLM.

.NOTES
    Alternative 100% native a install-docker-prerequisites.ps1, pour les machines
    ou Docker Desktop est instable (VM/VPS avec virtualisation capricieuse).
    Aucun caractere accentue dans ce fichier (evite les problemes d'encodage
    avec Windows PowerShell 5.1).
#>

$ErrorActionPreference = "Stop"

function Test-IsAdmin {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal   = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
    Write-Host "Droits administrateur requis -- relance avec elevation (UAC)..." -ForegroundColor Yellow
    $scriptPath = $MyInvocation.MyCommand.Path
    Start-Process powershell.exe -Verb RunAs -ArgumentList @(
        "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$scriptPath`""
    )
    exit
}

function Step($msg) { Write-Host ">> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "   OK - $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "   ! $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "   ERREUR - $msg" -ForegroundColor Red }

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  TUNISYS ATS -- Installation NATIVE (sans Docker)          " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# ===================================================================
# 0. WINGET
# ===================================================================
Step "Verification de winget..."
if ($null -eq (Get-Command winget -ErrorAction SilentlyContinue)) {
    Fail "winget introuvable. Installez 'App Installer' depuis le Microsoft Store, puis relancez."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}
Ok "winget disponible."

function Install-IfMissing($wingetId, $checkCommand, $friendlyName) {
    if (Get-Command $checkCommand -ErrorAction SilentlyContinue) {
        Ok "$friendlyName deja installe."
        return
    }
    Step "Installation de $friendlyName..."
    winget install --id $wingetId --source winget --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) {
        Warn "$friendlyName : l'installation via winget a rencontre un souci (code $LASTEXITCODE)."
        Warn "Vous devrez peut-etre l'installer manuellement."
    } else {
        Ok "$friendlyName installe."
    }
}

# ===================================================================
# 1. JAVA 21 (JDK)
# ===================================================================
Install-IfMissing "EclipseAdoptium.Temurin.21.JDK" "java" "Java 21 (JDK Temurin)"

# ===================================================================
# 2. MAVEN (pas de paquet winget officiel fiable -- telechargement direct)
# ===================================================================
Step "Verification de Maven..."
if (Get-Command mvn -ErrorAction SilentlyContinue) {
    Ok "Maven deja installe."
} else {
    Step "Detection de la derniere version d'Apache Maven..."
    $mavenVersion = $null
    try {
        $listing = Invoke-WebRequest -Uri "https://dlcdn.apache.org/maven/maven-3/" -UseBasicParsing
        $versions = $listing.Links | Where-Object { $_.href -match '^\d+\.\d+\.\d+/$' } |
            ForEach-Object { $_.href.TrimEnd('/') }
        $mavenVersion = $versions | Sort-Object { [version]$_ } -Descending | Select-Object -First 1
    } catch {
        Warn "Impossible de detecter automatiquement la derniere version."
    }
    if (-not $mavenVersion) {
        $mavenVersion = "3.9.16"  # repli si la detection automatique echoue
        Warn "Utilisation de la version de repli $mavenVersion (peut etre perimee -- verifiez"
        Warn "https://maven.apache.org/download.cgi si l'installation echoue)."
    } else {
        Ok "Derniere version detectee : $mavenVersion"
    }

    Step "Telechargement d'Apache Maven $mavenVersion..."
    $mavenUrl = "https://dlcdn.apache.org/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
    $mavenZip = "$env:TEMP\apache-maven.zip"
    $mavenInstallDir = "C:\apache-maven"

    try {
        try {
            Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenZip -UseBasicParsing
        } catch {
            # Repli sur les archives si le serveur principal (qui ne garde que les
            # toutes dernieres versions) ne l'a plus.
            Warn "Non trouve sur dlcdn.apache.org, tentative via archive.apache.org..."
            $mavenUrl = "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
            Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenZip -UseBasicParsing
        }

        if (Test-Path $mavenInstallDir) { Remove-Item $mavenInstallDir -Recurse -Force }
        Expand-Archive -Path $mavenZip -DestinationPath "C:\" -Force
        Rename-Item -Path "C:\apache-maven-$mavenVersion" -NewName "apache-maven" -Force
        Remove-Item $mavenZip -Force

        $mavenBin = "$mavenInstallDir\bin"
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        if ($currentPath -notlike "*$mavenBin*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$mavenBin", "Machine")
        }
        $env:Path += ";$mavenBin"   # disponible immediatement dans cette session aussi

        Ok "Maven $mavenVersion installe dans $mavenInstallDir et ajoute au PATH systeme."
    } catch {
        Warn "Telechargement/installation de Maven echoue : $($_.Exception.Message)"
        Warn "Installez-le manuellement depuis https://maven.apache.org/download.cgi"
        Warn "(extraire le zip et ajouter son dossier bin/ au PATH)"
    }
}

# ===================================================================
# 3. NODE.JS 22
# ===================================================================
Install-IfMissing "OpenJS.NodeJS.LTS" "node" "Node.js"

# ===================================================================
# 4. PYTHON 3.11
# ===================================================================
Install-IfMissing "Python.Python.3.11" "python" "Python 3.11"

# ===================================================================
# 5. POSTGRESQL
# ===================================================================
Step "Verification de PostgreSQL..."
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgService) {
    Ok "PostgreSQL deja installe (service : $($pgService.Name))."
} else {
    Step "Installation de PostgreSQL 16..."
    winget install --id PostgreSQL.PostgreSQL.16 --source winget --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) {
        Warn "Installation PostgreSQL via winget en echec (code $LASTEXITCODE)."
        Warn "Installez-le manuellement depuis https://www.postgresql.org/download/windows/"
    } else {
        Ok "PostgreSQL installe."
        Warn "Notez le mot de passe du superutilisateur 'postgres' defini pendant l'installation."
    }
}

# ===================================================================
# 6. OLLAMA (LLM on-premise)
# ===================================================================
Install-IfMissing "Ollama.Ollama" "ollama" "Ollama"

Write-Host ""
Warn "Redemarrez ce terminal (ou toute la session) pour que les nouvelles variables"
Warn "PATH (java, mvn, node, python, ollama) soient bien prises en compte, puis"
Warn "relancez ce script une seconde fois pour finir la configuration."
Write-Host ""

# Verifie si tout est bien dans le PATH avant de continuer la config
$allReady = (Get-Command java -ErrorAction SilentlyContinue) -and
            (Get-Command mvn -ErrorAction SilentlyContinue) -and
            (Get-Command node -ErrorAction SilentlyContinue) -and
            (Get-Command python -ErrorAction SilentlyContinue) -and
            (Get-Command ollama -ErrorAction SilentlyContinue)

if (-not $allReady) {
    Warn "Certains outils ne sont pas encore detectes dans cette session PowerShell."
    Warn "Fermez cette fenetre, rouvrez un NOUVEAU PowerShell en administrateur,"
    Warn "et relancez ce script : il reprendra directement a la configuration."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 0
}

# ===================================================================
# 7. CONFIGURATION POSTGRESQL (base + utilisateur applicatif)
# ===================================================================
Step "Configuration de la base de donnees PostgreSQL..."
$env:PGPASSWORD = Read-Host "Mot de passe du superutilisateur 'postgres' (defini a l'installation)"

$createDbSql = @"
DO `$`$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tunisys') THEN
      CREATE ROLE tunisys WITH LOGIN PASSWORD 'change_me_postgres';
   END IF;
END
`$`$;
"@
$createDbSql | Out-File -FilePath "$env:TEMP\create_role.sql" -Encoding ASCII

try {
    & psql -U postgres -h localhost -f "$env:TEMP\create_role.sql" 2>&1 | Out-Null
    & psql -U postgres -h localhost -c "CREATE DATABASE tunisys_ats OWNER tunisys;" 2>&1 | Out-Null
    & psql -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE tunisys_ats TO tunisys;" 2>&1 | Out-Null
    Ok "Base 'tunisys_ats' et utilisateur 'tunisys' configures (mot de passe : change_me_postgres)."
    Warn "Changez ce mot de passe pour un usage en production (ALTER ROLE tunisys WITH PASSWORD '...')."

    # Docker executait automatiquement ces scripts au premier demarrage
    # (docker-entrypoint-initdb.d) -- en natif il faut les lancer nous-memes.
    $scriptDir2 = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectRoot2 = Split-Path -Parent $scriptDir2
    $initDir = Join-Path $projectRoot2 "backend\src\main\resources\db\init"
    if (-not (Test-Path $initDir)) { $initDir = Join-Path $scriptDir2 "backend\src\main\resources\db\init" }

    if (Test-Path $initDir) {
        Step "Creation des tables et donnees de reference (roles, compte admin)..."
        $env:PGPASSWORD = "change_me_postgres"
        Get-ChildItem $initDir -Filter "*.sql" | Sort-Object Name | ForEach-Object {
            Step "  Execution de $($_.Name)..."
            & psql -U tunisys -h localhost -d tunisys_ats -f $_.FullName
        }
        Ok "Schema et donnees de reference crees (compte admin@tunisys.com / Admin@2026)."
    } else {
        Warn "Dossier db/init introuvable -- executez manuellement les scripts SQL du projet"
        Warn "(backend/src/main/resources/db/init/*.sql) contre la base tunisys_ats."
    }
} catch {
    Warn "Configuration automatique de Postgres echouee -- vous devrez creer la base manuellement :"
    Warn "  psql -U postgres -c `"CREATE ROLE tunisys WITH LOGIN PASSWORD 'change_me_postgres';`""
    Warn "  psql -U postgres -c `"CREATE DATABASE tunisys_ats OWNER tunisys;`""
    Warn "  puis executez les scripts backend/src/main/resources/db/init/*.sql contre cette base."
}

# ===================================================================
# 8. MODELE LLM OLLAMA
# ===================================================================
Step "Demarrage d'Ollama..."
Start-Process ollama -ArgumentList "serve" -WindowStyle Minimized
Start-Sleep -Seconds 5

$ollamaModel = "llama3.2:3b"   # modele leger (~2 Go), plus robuste sur connexion instable
Step "Telechargement du modele $ollamaModel (retente automatiquement en cas de coupure)..."

$pullOk = $false
for ($i = 1; $i -le 10; $i++) {
    & ollama pull $ollamaModel
    if ($LASTEXITCODE -eq 0) { $pullOk = $true; break }
    Warn "Tentative $i echouee (incident reseau probable), nouvel essai dans 10s..."
    Start-Sleep -Seconds 10
}

if ($pullOk) {
    Ok "Modele LLM '$ollamaModel' pret."
} else {
    Fail "Le telechargement du modele LLM a echoue apres 10 tentatives."
    Warn "Relancez juste cette commande plus tard, elle reprendra la ou elle s'est arretee :"
    Warn "   ollama pull $ollamaModel"
    Warn "Verifiez aussi avec : ollama list"
}

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host "  Prerequis natifs installes. Lancez maintenant :            " -ForegroundColor Green
Write-Host "     .\build-and-run-native.ps1                              " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Read-Host "Appuyez sur Entree pour fermer"
