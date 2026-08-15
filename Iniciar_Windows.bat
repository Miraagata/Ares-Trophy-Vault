@echo off
title Ares Trophy Vault - Offline Server
cd /d "%~dp0"
echo ===================================================
echo   Ares Trophy Vault - Servidor Local Offline
echo ===================================================
echo.
echo Verificando Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao foi encontrado no seu computador!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Iniciando o servidor do Ares Trophy Vault em http://localhost:3000 ...
echo O navegador abrira automaticamente em instantes.
echo.
echo (Para fechar o programa, feche esta janela ou pressione Ctrl+C)
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"
set NODE_ENV=production
node dist/server.cjs
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] O servidor foi encerrado.
    pause
)

