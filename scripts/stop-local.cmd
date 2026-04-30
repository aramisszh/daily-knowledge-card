@echo off
setlocal

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo Stopping process %%p on port 3000
  taskkill /PID %%p /F
  exit /b
)

echo No server is listening on port 3000.
pause
