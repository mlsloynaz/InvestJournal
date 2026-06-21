@echo off
setlocal
set "MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 9.7\bin"
set "ROOT=%~dp0.."
set "DATA_DIR=%ROOT%\mysql-data"
set "INIT_FILE=%~dp0mysql-init.sql"

if not exist "%DATA_DIR%" (
  mkdir "%DATA_DIR%"
  "%MYSQL_BIN%\mysqld.exe" --initialize-insecure --datadir="%DATA_DIR%"
)

netstat -an | findstr /R /C:":3307 .*LISTENING" >nul 2>&1
if %ERRORLEVEL%==0 (
  echo MySQL already listening on port 3307
  exit /b 0
)

start "" /B "%MYSQL_BIN%\mysqld.exe" --datadir="%DATA_DIR%" --port=3307 --bind-address=127.0.0.1 --init-file="%INIT_FILE%"

echo Starting MySQL on port 3307 ^(data: %DATA_DIR%^)...
timeout /t 3 /nobreak >nul
echo Ready. DATABASE_URL=mysql://invest:invest@localhost:3307/investjournal
