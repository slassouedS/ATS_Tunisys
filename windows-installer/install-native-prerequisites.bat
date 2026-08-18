@echo off
REM Lance le script d'installation native en contournant la politique
REM d'execution PowerShell par defaut, sans la modifier de facon permanente.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-native-prerequisites.ps1"
pause
