@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm nao foi encontrado. Instale o Node.js antes de abrir o app.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

echo Iniciando MyBacklog...
start "MyBacklog Dev Server" cmd /k "cd /d ""%~dp0"" && npm run dev"

timeout /t 5 /nobreak >nul
start "" "http://127.0.0.1:4173"

exit /b 0
