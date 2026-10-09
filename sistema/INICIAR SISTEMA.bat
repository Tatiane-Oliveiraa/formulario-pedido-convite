@echo off
title Raiz e Pixel - Painel de Gestao

cd /d "%~dp0"

set PORT=8080

echo.
echo  ====================================
echo   Raiz e Pixel - Painel de Gestao
echo  ====================================
echo.

:: Matar qualquer servidor Python na porta que possa estar rodando
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% "') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo  Iniciando servidor local...

python --version >nul 2>&1
if %errorlevel% == 0 goto :usa_python

py --version >nul 2>&1
if %errorlevel% == 0 goto :usa_py

echo  Python nao encontrado!
echo  Instale em: https://www.python.org/downloads/
echo  Marque "Add Python to PATH" ao instalar.
pause
goto :fim

:usa_python
:: Iniciar servidor em segundo plano
start /b python -m http.server %PORT% >nul 2>&1
:: Aguardar 2 segundos para o servidor iniciar
ping -n 3 127.0.0.1 >nul
:: Abrir browser
start "" http://localhost:%PORT%/app.html
echo  Servidor rodando em http://localhost:%PORT%/app.html
echo.
echo  Para encerrar o sistema, feche esta janela.
echo  (ou pressione qualquer tecla)
pause >nul
taskkill /f /im python.exe >nul 2>&1
goto :fim

:usa_py
start /b py -m http.server %PORT% >nul 2>&1
ping -n 3 127.0.0.1 >nul
start "" http://localhost:%PORT%/app.html
echo  Servidor rodando em http://localhost:%PORT%/app.html
echo.
echo  Para encerrar o sistema, feche esta janela.
pause >nul
goto :fim

:fim
