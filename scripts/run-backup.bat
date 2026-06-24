@echo off
REM Lance la sauvegarde complete depuis la racine du projet et journalise.
cd /d "%~dp0.."
node scripts\backup-full.mjs >> backups\backup.log 2>&1
