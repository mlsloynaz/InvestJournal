# Start InvestJournal local MySQL (data in .\mysql-data, port 3307)
$ErrorActionPreference = "Stop"
$mysqlBin = "C:\Program Files\MySQL\MySQL Server 9.7\bin"
$dataDir = Join-Path $PSScriptRoot "..\mysql-data" | Resolve-Path -ErrorAction SilentlyContinue
if (-not $dataDir) {
  $dataDir = Join-Path (Split-Path $PSScriptRoot -Parent) "mysql-data"
}
$initFile = Join-Path $PSScriptRoot "mysql-init.sql"

if (-not (Test-Path $dataDir)) {
  New-Item -ItemType Directory -Path $dataDir | Out-Null
  & "$mysqlBin\mysqld.exe" --initialize-insecure --datadir=$dataDir
}

$existing = Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "MySQL already listening on port 3307"
  exit 0
}

Start-Process -FilePath "$mysqlBin\mysqld.exe" -ArgumentList @(
  "--datadir=$dataDir",
  "--port=3307",
  "--bind-address=127.0.0.1",
  "--init-file=$initFile"
) -WindowStyle Hidden

Write-Host "Starting MySQL on port 3307 (data: $dataDir)..."
Start-Sleep -Seconds 3
Write-Host "Ready. DATABASE_URL=mysql://invest:invest@localhost:3307/investjournal"
