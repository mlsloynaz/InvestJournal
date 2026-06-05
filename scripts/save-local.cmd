@echo off
REM Local save only — no push, no remote
cd /d "%~dp0.."
if not exist .git git init
git add -A
git commit -F "%~dp0commit-message.txt"
echo.
echo Done. Local git only at C:\Code\InvestJournal
echo No remote configured — nothing pushed anywhere.
