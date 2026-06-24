# Enregistre une tache planifiee Windows : sauvegarde COMPLETE hebdomadaire de
# la base BonVoleur (SQL + Storage), avec rattrapage AU DEMARRAGE si le PC etait
# eteint a l'heure prevue (StartWhenAvailable).
#
# A lancer une seule fois :  powershell -ExecutionPolicy Bypass -File scripts\register-backup-task.ps1

$ErrorActionPreference = "Stop"

$bat  = Join-Path $PSScriptRoot "run-backup.bat"
$proj = Split-Path -Parent $PSScriptRoot
$name = "BonVoleur Backup Hebdo"

$action  = New-ScheduledTaskAction -Execute $bat -WorkingDirectory $proj
# Tous les lundis a 12h00. Si le PC est eteint -> la tache se lance au prochain
# demarrage (StartWhenAvailable).
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 12:00
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger `
  -Settings $settings -Force `
  -Description "Sauvegarde hebdo complete de BonVoleur (pg_dump + fichiers Storage). Rattrape au demarrage si le PC etait eteint."

Write-Host "Tache '$name' enregistree (lundi 12h, rattrapage au demarrage)." -ForegroundColor Green
