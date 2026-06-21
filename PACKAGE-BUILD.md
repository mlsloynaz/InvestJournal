# Browser package (copy to another PC)

Produces a **production build only** folder — no dev source needed on the target PC.

## Create the package (on your dev PC)

```powershell
cd C:\Code\InvestJournal
npm run db:start
npm install
npm run package
```

Output folder:

`C:\Code\InvestJournal\dist\InvestJournal-browser`

Zip that folder and copy it (USB, OneDrive, etc.). **Do not push to git.**

To include your database, also copy **`mysql-data\`** into the package folder before zipping.

## On the other PC

1. Install **Node.js 20+** and **MySQL Server 8+**
2. Unzip `InvestJournal-browser`
3. Run **`setup.cmd`** (once) — starts local MySQL, creates tables
4. Run **`start.cmd`**
5. Open **http://localhost:3000**

## What gets packaged

- Next.js **standalone** server (`server.js`)
- Static assets + `public/`
- `start-mysql.cmd` + `mysql-init.sql` + `prisma/schema.prisma`
- `start.cmd` / `setup.cmd` / `INSTALL.txt`

## Not included

- Full source repo
- Your `.env` (only `.env.example` — copy and edit FinanceAI keys)
- `mysql-data` (copy separately if you want existing data)
