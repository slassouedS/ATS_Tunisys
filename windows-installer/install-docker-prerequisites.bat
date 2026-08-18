@echo off
REM Lance le script PowerShell d'installation en contournant la politique
REM d'execution par defaut de Windows (ExecutionPolicy Restricted), sans
REM modifier cette politique de facon permanente sur votre machine.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-docker-prerequisites.ps1"
pause
