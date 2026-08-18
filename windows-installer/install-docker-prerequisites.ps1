#Requires -Version 5.1
<#
.SYNOPSIS
    Installe automatiquement tous les prerequis Windows necessaires pour lancer
    la plateforme TUNISYS ATS via Docker Compose :
      1. Elevation des droits administrateur (fenetre UAC classique)
      2. Activation + installation de WSL2 (prerequis obligatoire de Docker Desktop)
      3. Installation de Docker Desktop via winget (aucun telechargement manuel)
      4. Demarrage de Docker Desktop et attente qu'il soit pleinement operationnel

.NOTES
    - Compatible Windows 10 (2004+) et Windows 11.
    - Un redemarrage peut etre necessaire apres l'activation de WSL2 (le script le
      detecte et vous previent -- relancez simplement le script apres redemarrage,
      il reprendra la ou il s'etait arrete).
    - Ce fichier ne contient volontairement aucun caractere accentue, pour eviter
      les problemes d'encodage avec Windows PowerShell 5.1 (qui ne lit pas
      correctement l'UTF-8 sans BOM).
    - Usage :  double-cliquez sur le fichier .bat fourni a cote
               ou depuis un terminal :  powershell -ExecutionPolicy Bypass -File .\install-docker-prerequisites.ps1
#>

# ===================================================================
# 0. ELEVATION ADMINISTRATEUR (fenetre UAC Windows standard)
# ===================================================================
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
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-File", "`"$scriptPath`""
    )
    exit
}

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  TUNISYS ATS -- Installation automatique des prerequis      " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

function Step($msg) { Write-Host ">> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "   OK - $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "   ! $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "   ERREUR - $msg" -ForegroundColor Red }

# ===================================================================
# 1. VERIFICATION / INSTALLATION AUTOMATIQUE DE WINGET
# ===================================================================
Step "Verification de winget (gestionnaire de paquets Windows)..."
$wingetOk = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)

if (-not $wingetOk) {
    Warn "winget est introuvable -- tentative d'installation automatique..."

    $tempDir = Join-Path $env:TEMP "tunisys-winget-setup"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    function Install-AppxDependency($url, $fileName) {
        $target = Join-Path $tempDir $fileName
        try {
            Step "Telechargement de $fileName..."
            Invoke-WebRequest -Uri $url -OutFile $target -UseBasicParsing
            Add-AppxPackage -Path $target -ErrorAction Stop
            Ok "$fileName installe."
            return $true
        } catch {
            Warn "Echec sur $fileName : $($_.Exception.Message)"
            return $false
        }
    }

    # Dependances requises par le App Installer (winget) sur les systemes ou elles manquent
    Install-AppxDependency `
        "https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx" `
        "VCLibs.x64.appx" | Out-Null

    Install-AppxDependency `
        "https://github.com/microsoft/microsoft-ui-xaml/releases/download/v2.8.6/Microsoft.UI.Xaml.2.8.x64.appx" `
        "Microsoft.UI.Xaml.2.8.x64.appx" | Out-Null

    $wingetInstalled = Install-AppxDependency `
        "https://aka.ms/getwinget" `
        "Microsoft.DesktopAppInstaller.msixbundle"

    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

    # winget est expose via un "App Execution Alias" : meme installe avec succes,
    # il peut ne devenir visible que dans une NOUVELLE session PowerShell.
    $wingetOk = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)

    if (-not $wingetOk) {
        if ($wingetInstalled) {
            Warn "winget vient d'etre installe mais n'est pas encore detecte dans cette fenetre."
            Warn "C'est normal (App Execution Alias) -- FERMEZ cette fenetre et relancez le script"
            Warn "une seconde fois : winget sera alors detecte correctement."
        } else {
            Fail "L'installation automatique de winget a echoue."
            Warn "Installez-le manuellement : ouvrez le Microsoft Store, cherchez 'App Installer',"
            Warn "installez/mettez a jour, puis relancez ce script."
            Warn "Lien direct alternatif : https://github.com/microsoft/winget-cli/releases/latest"
        }
        Read-Host "Appuyez sur Entree pour fermer"
        exit 1
    }
    Ok "winget est maintenant disponible."
} else {
    Ok "winget est disponible."
}

# ===================================================================
# 2. WSL2 -- activation des fonctionnalites Windows necessaires
# ===================================================================
Step "Verification de WSL2..."

$needsReboot = $false

function Get-FeatureState($name) {
    (Get-WindowsOptionalFeature -Online -FeatureName $name -ErrorAction SilentlyContinue).State
}

$wslFeature        = Get-FeatureState "Microsoft-Windows-Subsystem-Linux"
$vmPlatformFeature = Get-FeatureState "VirtualMachinePlatform"

if ($wslFeature -ne "Enabled") {
    Step "Activation de la fonctionnalite 'Windows Subsystem for Linux'..."
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart | Out-Null
    Ok "Fonctionnalite WSL activee (redemarrage requis)."
    $needsReboot = $true
} else {
    Ok "Windows Subsystem for Linux deja active."
}

if ($vmPlatformFeature -ne "Enabled") {
    Step "Activation de la fonctionnalite 'Virtual Machine Platform'..."
    Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart | Out-Null
    Ok "Fonctionnalite Virtual Machine Platform activee (redemarrage requis)."
    $needsReboot = $true
} else {
    Ok "Virtual Machine Platform deja active."
}

if ($needsReboot) {
    Write-Host ""
    Warn "Un REDEMARRAGE de Windows est necessaire pour terminer l'activation de WSL2."
    Warn "Apres le redemarrage, relancez simplement ce meme script : il reprendra"
    Warn "automatiquement l'installation (mise a jour du noyau WSL2, Docker Desktop, etc.)."
    Write-Host ""
    $answer = Read-Host "Redemarrer maintenant ? (O/N)"
    if ($answer -match '^[oOyY]') {
        Restart-Computer -Force
    } else {
        Write-Host "Redemarrez manuellement puis relancez le script." -ForegroundColor Yellow
    }
    exit 0
}

# Mise a jour du noyau Linux WSL2 + definition de la version par defaut
Step "Mise a jour du noyau WSL2 (wsl --update)..."
try {
    wsl --update 2>&1 | Out-Null
    Ok "Noyau WSL2 a jour."
} catch {
    Warn "Impossible de lancer 'wsl --update' automatiquement (sera gere par l'installeur Docker Desktop si besoin)."
}

Step "Definition de WSL2 comme version par defaut..."
try {
    wsl --set-default-version 2 2>&1 | Out-Null
    Ok "WSL2 defini par defaut."
} catch {
    Warn "Impossible de definir WSL2 par defaut automatiquement -- Docker Desktop le proposera a la premiere ouverture."
}

# ===================================================================
# 3. DOCKER DESKTOP -- installation via winget
# ===================================================================
Step "Verification de Docker Desktop..."

$dockerInstalled = $null -ne (Get-Command docker -ErrorAction SilentlyContinue) -or
                   (Test-Path "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe")

if ($dockerInstalled) {
    Ok "Docker Desktop est deja installe."
} else {
    Step "Installation de Docker Desktop via winget (Docker.DockerDesktop)..."
    Write-Host "   (cela peut prendre plusieurs minutes selon votre connexion)" -ForegroundColor DarkGray
    winget install --id Docker.DockerDesktop --source winget `
        --accept-package-agreements --accept-source-agreements --silent
    $wingetExitCode = $LASTEXITCODE

    if ($wingetExitCode -ne 0) {
        Warn "L'installation via winget a echoue (code $wingetExitCode)."
        Warn "Ce code correspond a un bug connu de certaines versions de winget (violation d'acces)."
        Step "Bascule vers le telechargement direct de l'installeur officiel Docker Desktop..."

        $installerPath = Join-Path $env:TEMP "DockerDesktopInstaller.exe"
        try {
            Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" `
                -OutFile $installerPath -UseBasicParsing
            Ok "Installeur Docker Desktop telecharge."

            Step "Installation silencieuse en cours (peut prendre plusieurs minutes)..."
            $proc = Start-Process -FilePath $installerPath `
                -ArgumentList "install", "--quiet", "--accept-license", "--backend=wsl2" `
                -Wait -PassThru
            Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue

            if ($proc.ExitCode -eq 0) {
                Ok "Docker Desktop installe avec succes (methode directe)."
            } else {
                Fail "L'installeur direct a retourne le code $($proc.ExitCode)."
                Warn "Telechargez et installez manuellement depuis : https://www.docker.com/products/docker-desktop/"
                Read-Host "Appuyez sur Entree pour fermer"
                exit 1
            }
        } catch {
            Fail "Echec du telechargement/installation direct : $($_.Exception.Message)"
            Warn "Telechargez et installez manuellement depuis : https://www.docker.com/products/docker-desktop/"
            Read-Host "Appuyez sur Entree pour fermer"
            exit 1
        }
    } else {
        Ok "Docker Desktop installe."
    }
}

# ===================================================================
# 4. DEMARRAGE DE DOCKER DESKTOP + ATTENTE DE DISPONIBILITE
# ===================================================================
Step "Verification si le moteur Docker repond deja..."
docker info *> $null
$engineAlreadyUp = ($LASTEXITCODE -eq 0)

if ($engineAlreadyUp) {
    Ok "Le moteur Docker repond deja -- pas besoin de relancer l'application Docker Desktop."
} else {
    Step "Recherche de Docker Desktop.exe..."
    $candidatePaths = @(
        "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "$Env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe",
        "$Env:ProgramFiles(x86)\Docker\Docker\Docker Desktop.exe"
    )
    $dockerExe = $candidatePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $dockerExe) {
        # Recherche plus large en dernier recours (peut prendre quelques secondes)
        $found = Get-ChildItem -Path "$Env:ProgramFiles","$Env:LOCALAPPDATA\Programs" `
            -Filter "Docker Desktop.exe" -Recurse -ErrorAction SilentlyContinue -File |
            Select-Object -First 1
        if ($found) { $dockerExe = $found.FullName }
    }

    if ($dockerExe) {
        Step "Demarrage de Docker Desktop ($dockerExe)..."
        Start-Process -FilePath $dockerExe
    } else {
        Warn "Impossible de localiser Docker Desktop.exe automatiquement."
        Warn "Demarrez-le manuellement depuis le menu Demarrer, puis laissez ce script continuer."
    }
}

Step "Attente que le moteur Docker soit operationnel (jusqu'a 5 minutes)..."
$maxAttempts = 60
$attempt = 0
$dockerReady = $engineAlreadyUp

while (-not $dockerReady -and $attempt -lt $maxAttempts) {
    $attempt++
    Start-Sleep -Seconds 5
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        break
    }
    Write-Host "   ... toujours en cours de demarrage (tentative $attempt/$maxAttempts)" -ForegroundColor DarkGray
}

Write-Host ""
if ($dockerReady) {
    Ok "Docker Desktop est pret et operationnel !"
} else {
    Fail "Docker Desktop n'a pas signale etre pret apres 5 minutes."
    Warn "Ouvrez Docker Desktop manuellement -- il termine peut-etre encore sa premiere initialisation"
    Warn "(premiere installation de WSL2 + telechargement de l'image de base peut prendre plus longtemps)."
    Warn "Une fois l'icone baleine stable dans la barre des taches, relancez ce script : il reprendra"
    Warn "directement au deploiement de la plateforme."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}

# ===================================================================
# 5. DEPLOIEMENT AUTOMATIQUE DE LA PLATEFORME TUNISYS ATS
# ===================================================================
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  Deploiement de la plateforme TUNISYS ATS                  " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# Le script cherche docker-compose.yml a plusieurs emplacements plausibles,
# car il peut avoir ete place soit a la racine du projet, soit dans le
# sous-dossier windows-installer/ a cote du reste du projet.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$candidateRoots = @(
    $scriptDir,                                   # le script est a la racine du projet
    (Split-Path -Parent $scriptDir),               # le script est dans windows-installer/
    (Get-Location).Path                            # dossier courant du terminal
)

# Ajoute aussi les sous-dossiers directs (cas ou le zip a ete extrait dans un
# sous-dossier, ex: C:\ATS\tunisys-ats\docker-compose.yml)
$subDirs = Get-ChildItem -Path $scriptDir -Directory -ErrorAction SilentlyContinue |
    ForEach-Object { $_.FullName }
$candidateRoots += $subDirs

$projectRoot = $null
foreach ($candidate in $candidateRoots) {
    $test = Join-Path $candidate "docker-compose.yml"
    if (Test-Path $test) {
        $projectRoot = $candidate
        break
    }
}

# Si toujours pas trouve : cherche une archive tunisys-ats-platform.zip a proximite
# et l'extrait automatiquement (evite a l'utilisateur de le faire a la main).
if (-not $projectRoot) {
    Warn "docker-compose.yml introuvable directement -- recherche d'une archive a extraire..."

    $zipSearchDirs = @(
        $scriptDir,
        (Split-Path -Parent $scriptDir),
        (Get-Location).Path,
        (Join-Path $Env:USERPROFILE "Downloads")
    ) | Select-Object -Unique

    $zipCandidate = $null
    foreach ($dir in $zipSearchDirs) {
        if (-not (Test-Path $dir)) { continue }
        $found = Get-ChildItem -Path $dir -Filter "*tunisys*ats*.zip" -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($found) { $zipCandidate = $found.FullName; break }
    }

    if ($zipCandidate) {
        Step "Archive trouvee : $zipCandidate"
        $extractDest = $scriptDir
        try {
            Step "Extraction vers $extractDest ..."
            # Extraction manuelle entree par entree (plus robuste qu'Expand-Archive,
            # qui peut echouer selon l'ordre des entrees de dossier dans certains zips).
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            $zip = [System.IO.Compression.ZipFile]::OpenRead($zipCandidate)
            try {
                foreach ($entry in $zip.Entries) {
                    if ([string]::IsNullOrEmpty($entry.Name) -and $entry.FullName.EndsWith("/")) {
                        # Entree de dossier pur : s'assure qu'il existe puis passe au suivant
                        $dirPath = Join-Path $extractDest ($entry.FullName -replace '/', '\')
                        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
                        continue
                    }
                    $targetPath = Join-Path $extractDest ($entry.FullName -replace '/', '\')
                    $targetDir = Split-Path -Parent $targetPath
                    if (-not (Test-Path $targetDir)) {
                        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                    }
                    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetPath, $true)
                }
                Ok "Extraction terminee ($($zip.Entries.Count) elements)."
            } finally {
                $zip.Dispose()
            }
        } catch {
            Warn "Echec de l'extraction automatique : $($_.Exception.Message)"
        }

        # Re-scan apres extraction : ajoute les nouveaux sous-dossiers crees
        $newSubDirs = Get-ChildItem -Path $extractDest -Directory -ErrorAction SilentlyContinue |
            ForEach-Object { $_.FullName }
        $rescanRoots = (@($extractDest) + $newSubDirs) | Select-Object -Unique
        foreach ($candidate in $rescanRoots) {
            $test = Join-Path $candidate "docker-compose.yml"
            if (Test-Path $test) {
                $projectRoot = $candidate
                break
            }
        }
        if ($projectRoot) {
            Ok "Projet localise apres extraction automatique : $projectRoot"
        }
    } else {
        Warn "Aucune archive tunisys-ats*.zip trouvee dans :"
        $zipSearchDirs | ForEach-Object { Warn "   - $_" }
    }
}

if (-not $projectRoot) {
    Warn "docker-compose.yml toujours introuvable."
    Write-Host ""
    $manualPath = Read-Host "Collez ici le chemin complet du dossier contenant docker-compose.yml (ou laissez vide pour annuler)"
    if ($manualPath -and (Test-Path (Join-Path $manualPath "docker-compose.yml"))) {
        $projectRoot = $manualPath
    } else {
        Warn "Placez tunisys-ats-platform.zip dans le meme dossier que ce script puis relancez,"
        Warn "ou extrayez-le manuellement et lancez : docker compose up -d --build"
        Read-Host "Appuyez sur Entree pour fermer"
        exit 0
    }
}

$composeFile = Join-Path $projectRoot "docker-compose.yml"
Ok "Projet trouve : $projectRoot"

Push-Location $projectRoot

# Elasticsearch a besoin de vm.max_map_count >= 262144, reglable uniquement au
# niveau de la VM WSL2 elle-meme (pas dans le conteneur). Sans effet si deja
# positionne ou si la commande n'est pas disponible -- ne bloque pas le script.
Step "Ajustement de vm.max_map_count pour Elasticsearch (VM WSL2)..."
try {
    wsl -d docker-desktop sysctl -w vm.max_map_count=262144 2>&1 | Out-Null
    Ok "vm.max_map_count regle a 262144."
} catch {
    Warn "Impossible de regler vm.max_map_count automatiquement (Elasticsearch pourrait echouer au demarrage)."
    Warn "Commande manuelle si besoin : wsl -d docker-desktop sysctl -w vm.max_map_count=262144"
}

$envFile = Join-Path $projectRoot ".env"
$envExample = Join-Path $projectRoot ".env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Ok "Fichier .env cree a partir de .env.example (valeurs par defaut)."
    Warn "Pensez a changer les mots de passe dans .env avant un usage en production."
}

Step "Lancement de 'docker compose up -d --build' (peut prendre 10-20 minutes au premier lancement)..."
Write-Host "   -> telechargement des images, build du backend/frontend, telechargement du modele LLM..." -ForegroundColor DarkGray
docker compose up -d --build
$composeExitCode = $LASTEXITCODE

if ($composeExitCode -ne 0) {
    Pop-Location
    Fail "Le deploiement a echoue (code $composeExitCode)."
    Warn "Consultez les logs avec : docker compose logs"
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}

Ok "Conteneurs demarres. Attente que le frontend reponde (jusqu'a 3 minutes)..."
$maxAttempts = 36
$attempt = 0
$frontendReady = $false
while ($attempt -lt $maxAttempts) {
    $attempt++
    Start-Sleep -Seconds 5
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:4200" -UseBasicParsing -TimeoutSec 3
        if ($resp.StatusCode -eq 200) { $frontendReady = $true; break }
    } catch { }
    Write-Host "   ... build/demarrage des services en cours (tentative $attempt/$maxAttempts)" -ForegroundColor DarkGray
}

Pop-Location

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
if ($frontendReady) {
    Ok "La plateforme TUNISYS ATS est prete !"
} else {
    Warn "Les conteneurs sont lances mais le frontend ne repond pas encore."
    Warn "Le premier build peut prendre plus de 3 minutes selon votre machine -- reessayez"
    Warn "d'ouvrir http://localhost:4200 dans quelques minutes, ou verifiez : docker compose logs -f"
}
Write-Host "  Application       : http://localhost:4200                " -ForegroundColor Green
Write-Host "  API (Swagger)     : http://localhost:8080/swagger-ui.html" -ForegroundColor Green
Write-Host "  Compte admin      : admin@tunisys.com / Admin@2026        " -ForegroundColor Green
Write-Host "  (a changer immediatement apres la premiere connexion)     " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green

if ($frontendReady) {
    Start-Process "http://localhost:4200"
}

Write-Host ""
Read-Host "Appuyez sur Entree pour fermer cette fenetre"
