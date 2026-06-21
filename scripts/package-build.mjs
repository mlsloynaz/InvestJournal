import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = join(root, "dist", "InvestJournal-browser");
const standaloneSrc = join(root, ".next", "standalone");
const staticSrc = join(root, ".next", "static");
const publicSrc = join(root, "public");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

function copyPrismaEngine() {
  const clientSrc = join(root, "node_modules", ".prisma", "client");
  const clientDest = join(distRoot, "node_modules", ".prisma", "client");
  if (existsSync(clientSrc)) {
    mkdirSync(dirname(clientDest), { recursive: true });
    cpSync(clientSrc, clientDest, { recursive: true });
  }
  const prismaClientSrc = join(root, "node_modules", "@prisma", "client");
  const prismaClientDest = join(distRoot, "node_modules", "@prisma", "client");
  if (existsSync(prismaClientSrc)) {
    mkdirSync(dirname(prismaClientDest), { recursive: true });
    cpSync(prismaClientSrc, prismaClientDest, { recursive: true });
  }
}

console.log("Building production bundle (standalone)...\n");
run("npm run build");

if (!existsSync(standaloneSrc)) {
  console.error("Missing .next/standalone — build failed.");
  process.exit(1);
}

if (existsSync(distRoot)) {
  rmSync(distRoot, { recursive: true, force: true });
}
mkdirSync(distRoot, { recursive: true });

cpSync(standaloneSrc, distRoot, { recursive: true });

if (existsSync(staticSrc)) {
  mkdirSync(join(distRoot, ".next", "static"), { recursive: true });
  cpSync(staticSrc, join(distRoot, ".next", "static"), { recursive: true });
}

if (existsSync(publicSrc)) {
  cpSync(publicSrc, join(distRoot, "public"), { recursive: true });
}

mkdirSync(join(distRoot, "prisma"), { recursive: true });
cpSync(join(root, "prisma", "schema.prisma"), join(distRoot, "prisma", "schema.prisma"));
cpSync(join(root, "scripts", "mysql-init.sql"), join(distRoot, "mysql-init.sql"));
cpSync(join(root, ".env.example"), join(distRoot, ".env.example"));

copyPrismaEngine();

const runtimePkg = {
  name: "investjournal-browser-package",
  private: true,
  version: readFileSync(join(root, "package.json"), "utf8").match(/"version":\s*"([^"]+)"/)?.[1] ?? "0.0.0",
  scripts: {
    start: "node server.js",
    setup: "prisma db push",
  },
  dependencies: {
    prisma: "6.19.0",
    "@prisma/client": "6.19.0",
  },
};

writeFileSync(join(distRoot, "package.json"), JSON.stringify(runtimePkg, null, 2));

writeFileSync(
  join(distRoot, "start.cmd"),
  `@echo off
cd /d "%~dp0"
if not exist .env copy .env.example .env
set HOSTNAME=0.0.0.0
set PORT=3000
echo Open http://localhost:3000
node server.js
`,
);

writeFileSync(
  join(distRoot, "start-mysql.cmd"),
  `@echo off
setlocal
set "MYSQL_BIN=C:\\Program Files\\MySQL\\MySQL Server 9.7\\bin"
set "DATA_DIR=%~dp0mysql-data"
set "INIT_FILE=%~dp0mysql-init.sql"

if not exist "%DATA_DIR%" (
  mkdir "%DATA_DIR%"
  "%MYSQL_BIN%\\mysqld.exe" --initialize-insecure --datadir="%DATA_DIR%"
)

netstat -an | findstr /R /C:":3307 .*LISTENING" >nul 2>&1
if %ERRORLEVEL%==0 (
  echo MySQL already listening on port 3307
  exit /b 0
)

start "" /B "%MYSQL_BIN%\\mysqld.exe" --datadir="%DATA_DIR%" --port=3307 --bind-address=127.0.0.1 --init-file="%INIT_FILE%"
echo Starting MySQL on port 3307...
timeout /t 3 /nobreak >nul
`,
);

writeFileSync(
  join(distRoot, "setup.cmd"),
  `@echo off
cd /d "%~dp0"
if not exist .env copy .env.example .env
call start-mysql.cmd
call npm install --omit=dev
call npx prisma db push
echo.
echo Setup done. Run start.cmd
`,
);

writeFileSync(
  join(distRoot, "INSTALL.txt"),
  `InvestJournal — browser package (production build only)
=====================================================

Folder to copy or zip: this entire directory.

Requirements on target PC
-------------------------
- Windows 10/11
- Node.js 20+  (https://nodejs.org/)
- MySQL Server 8+  (same as dev PC; edit start-mysql.cmd if install path differs)

First-time setup (target PC)
----------------------------
1. Unzip/copy this folder anywhere (e.g. C:\\Apps\\InvestJournal-browser)
2. Double-click setup.cmd
   - Creates .env from .env.example
   - Starts local MySQL on port 3307 (mysql-data\\ folder)
   - Creates database tables
3. Double-click start.cmd
4. Browser: http://localhost:3000

Same Wi-Fi (optional)
---------------------
Other devices: http://YOUR_PC_IP:3000
(start.cmd already binds to 0.0.0.0)

Daily use
---------
1. start-mysql.cmd   (if MySQL is not running)
2. start.cmd

What is NOT included
--------------------
- Source code (only compiled build)
- Your .env secrets (copy .env.example manually)
- mysql-data (empty on first setup; copy mysql-data\\ from dev PC to keep data)

Backup data
-----------
- Folder: mysql-data\\
- Folder: public/uploads (strategy images)
`,
);

console.log("\nPackage ready:");
console.log(`  ${distRoot}`);
console.log("\nZip this folder and copy to another PC.");
console.log("On target PC: run setup.cmd once, then start.cmd");
