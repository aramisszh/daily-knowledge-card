@echo off
setlocal
cd /d "%~dp0.."

if exist ".env.local" (
  echo .env.local already exists.
) else (
  copy ".env.example" ".env.local" >nul
  echo Created .env.local from .env.example
)

echo.
echo Next:
echo 1. Optional: fill .env.local only if you want to keep future OpenAI or Supabase experiments
echo 2. Start the app with scripts/start-local.cmd
echo 3. The site now reads weekly cards from data/cards.json
echo 4. Ask Codex to generate the next 7-day batch when you want to refresh content
echo.
pause
