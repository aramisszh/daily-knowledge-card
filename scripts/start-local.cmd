@echo off
setlocal
cd /d "%~dp0.."

echo Starting daily-knowledge-card at http://localhost:3000
echo Press Ctrl+C in this window to stop the server.
echo.

npm.cmd run dev

pause
