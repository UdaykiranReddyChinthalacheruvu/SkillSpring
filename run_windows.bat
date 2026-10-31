@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SkillSpring - Candidate Matching

if exist ".env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do if not "%%A"=="" set "%%A=%%B"
)
if "%PORT%"=="" set "PORT=8000"
if "%DB_URL%"=="" set "DB_URL=jdbc:mysql://127.0.0.1:3306/job_matcher"
if "%DB_USER%"=="" set "DB_USER=root"

where javac >nul 2>&1 || (echo [ERROR] Install a Java JDK 17 or newer. & pause & exit /b 1)
if not exist "lib\mysql-connector-j-26.7.0.jar" (echo [ERROR] MySQL JDBC driver is missing from lib. & pause & exit /b 1)
if not exist "frontend\dist\index.html" (
  where node >nul 2>&1 || (echo [ERROR] Install Node.js 20 or newer to build the frontend. & pause & exit /b 1)
  where npm.cmd >nul 2>&1 || (echo [ERROR] npm was not found. & pause & exit /b 1)
  if not exist "frontend\node_modules\react" (
    echo [1/3] Installing frontend packages. Internet access is needed the first time.
    pushd frontend
    call npm.cmd install
    if errorlevel 1 (popd & goto fail)
    popd
  ) else echo [1/3] Frontend packages are ready.
  echo [2/3] Building the React frontend...
  pushd frontend
  call npm.cmd run build
  if errorlevel 1 (popd & goto fail)
  popd
) else echo [1/2] Using the included React production build.
if not exist "build\server" mkdir "build\server"
echo [2/2] Compiling Java backend...
javac --add-modules jdk.httpserver -encoding UTF-8 -d "build\server" "server\src\Json.java" "server\src\JobMatchServer.java"
if errorlevel 1 goto fail
echo.
echo [READY] Open http://127.0.0.1:%PORT% in your browser.
echo Keep this window open while using SkillSpring.
java --add-modules jdk.httpserver -cp "build\server;lib\mysql-connector-j-26.7.0.jar" JobMatchServer %PORT%
if errorlevel 1 goto fail
exit /b 0
:fail
echo.
echo Startup failed. Read the error above and check README.md.
pause
exit /b 1
