@echo off
setlocal
echo ==========================================
echo Configurando Deploy para Vercel (Revisado)
echo ==========================================

REM Tenta adicionar Git ao PATH temporariamente
set "PATH=%PATH%;C:\Program Files\Git\cmd"

REM Verifica se o Git esta disponivel
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Git nao encontrado!
    echo Por favor, instale o Git antes de continuar.
    pause
    exit /b
)

echo.
echo [1/4] Verificando configuracao de usuario...
REM Forca perguntar nome se nao estiver definido
for /f "tokens=*" %%a in ('git config user.name') do set GIT_USER=%%a
for /f "tokens=*" %%a in ('git config user.email') do set GIT_EMAIL=%%a

if "%GIT_USER%"=="" (
    echo Voce precisa configurar seu nome e email para o Git.
    :ASK_NAME
    set /p "NEW_NAME=Digite seu Nome: "
    if "%NEW_NAME%"=="" goto ASK_NAME
    git config user.name "%NEW_NAME%"
) else (
    echo Usuario configurado: %GIT_USER%
)

if "%GIT_EMAIL%"=="" (
    :ASK_EMAIL
    set /p "NEW_EMAIL=Digite seu Email: "
    if "%NEW_EMAIL%"=="" goto ASK_EMAIL
    git config user.email "%NEW_EMAIL%"
)

echo.
echo [2/4] Inicializando repositorio...
if not exist ".git" (
    git init
)

echo.
echo [3/4] Preparando arquivos...
git add .
git commit -m "Auto-commit para deploy"

echo.
echo [4/4] Enviando para GitHub...
python -c "print('Verificando remote...')" >nul 2>&1
git remote remove origin >nul 2>&1
git remote add origin https://github.com/eliasdmb/geoflow.git
git branch -M main
git push -u origin main

echo.
echo ==========================================
echo Processo finalizado!
echo ==========================================
pause
