# InvestJournal

Stock market journal based on the **Investep Academy** weekly checklist. Track tickers per week, daily metrics, trades, and a chronological analysis journal—with optional export for external AI (ChatGPT, Cursor).

**Location:** `C:\Code\InvestJournal`

---

## Tech stack

| Layer | Technology |
|-------|------------|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS |
| Database | MySQL 8 |
| ORM | Prisma |
| Local DB | Docker Compose (port **3307**) |

---

## How to run (first time)

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ (includes `npm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for MySQL), **or** your own MySQL instance

### 1. Install dependencies

```powershell
cd C:\Code\InvestJournal
npm install
```

### 2. Environment file

```powershell
copy .env.example .env
```

Default connection (Docker):

```env
DATABASE_URL="mysql://invest:invest@localhost:3307/investjournal"
```

If you use another MySQL host/port, edit `.env` accordingly.

### 3. Start MySQL

```powershell
docker compose up -d
```

Wait until the container is healthy. Verify Docker is on your PATH (`docker --version`).

### 4. Create database tables

```powershell
npx prisma generate
npx prisma db push
```

### 5. Start the app (development)

```powershell
npm run dev
```

Open in the browser: **http://localhost:3000**

---

## How to run (every day)

```powershell
cd C:\Code\InvestJournal
docker compose up -d
npm run dev
```

Stop the dev server with `Ctrl+C` in the terminal.

### Other npm scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run db:studio` | Prisma Studio (browse/edit DB) |
| `npm run db:push` | Sync schema to MySQL without migration files |
| `npm run db:migrate` | Create/apply Prisma migrations |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `'docker' is not recognized` | Install Docker Desktop and restart the terminal |
| `P1001` Can't reach database at `localhost:3307` | Run `docker compose up -d`, then `npx prisma db push` |
| **Strategies: Base de datos no disponible** | See below |
| `EPERM` on `prisma generate` | Stop `npm run dev` first, then `npm run setup` |
| `@prisma/client did not initialize` | Run `npm run setup`, restart dev server |
| Port 3000 in use | Stop the other process or run `npx next dev -p 3001` |
| Dashboard shows setup steps only | Database not connected; fix MySQL and refresh |
| Changes not visible | Save forms with **Guardar**; server actions refresh the page |

### Strategies / Prisma errors

1. **Stop** the dev server (`Ctrl+C` in the terminal running `npm run dev`).
2. Run:
   ```powershell
   cd C:\Code\InvestJournal
   docker compose up -d
   npm install
   npm run setup
   ```
3. Start again: `npm run dev`

`npm run setup` runs `prisma generate` + `prisma db push`.  
If `EPERM` appears, close Cursor terminals using the project and retry.

---

## Features

### Tickers

- Add and list stock symbols (e.g. `AAPL`, `NVDA`)
- Per-ticker hub with links to weekly workbook and analysis

### Weekly workbook (Investep checklist)

One record per **ticker + week** (week starts **Monday**).

| Section | Cadence | Content |
|---------|---------|---------|
| Header | Weekly | Price range, header notes |
| Items 1–7 | Weekly | FED, earnings, Bollinger, MAs, trend breaks, gaps, bid/ask (Sí / No / —) |
| Item 8 | Daily Mon–Fri | Distance, spot price, strike price |
| Items 9–10 | Per trade | Expiration, type, date/time, contracts, price, P&L $, plan % |

### Daily analysis journal

- Multiple entries per ticker per day
- Types: **Nota**, **Predicción**, **Error**
- Stored in chronological order (`entry_date` + `entry_at`)
- Default template for **Predicción** (bias + probabilities) when pasting AI output

### Export for AI (manual)

- **Generar Markdown** on the analysis page
- **Copiar al portapapeles** — paste into ChatGPT/Cursor with your charts
- Includes recent analysis, current week checklist, daily metrics, and trades
- No API keys or in-app AI in this phase

### Reports

- Checklist compliance % by ticker/week
- Trade count and weekly P&L
- Global count of analysis entries by type

### Earnings journal (planned)

- Database tables exist (`earnings_events`, plans, outcomes)
- UI placeholder at `/earnings` — implement later

---

## Use cases

### 1. Monday — open the week for a ticker

1. Go to **Tickers** → add or select a symbol.
2. Open **Checklist semanal** (current week).
3. Fill **rango precio** and weekly requirements (1–7).
4. Save with **Guardar checklist semanal**.

### 2. Each trading day — update metrics

1. Open the same weekly workbook.
2. In section **8 (L–V)**, enter distance / spot / strike for that day.
3. Click **Guardar** on that row.

### 3. After a trade — log it

1. On the weekly page, scroll to **Registro de operaciones**.
2. Fill the form and **+ Agregar operación**.
3. Weekly P&L updates on the page; see **Reports** for history.

### 4. Morning — daily note with AI (manual workflow)

1. Open **Análisis diario** for the ticker.
2. Click **Generar Markdown** → **Copiar al portapapeles**.
3. Paste into your AI tool **with chart screenshots**.
4. Ask for the “primera nota del día” (bias + probabilities).
5. Copy the AI answer into the form (type **Predicción**) → **Guardar entrada**.

### 5. End of week — review discipline

1. Open **Reports** — compliance % and P&L.
2. Review **Error** vs **Predicción** counts on the ticker hub.
3. Adjust next week’s checklist based on what was missed.

### 6. Learning from mistakes

1. After a bad trade, add an entry with type **Error**.
2. On the next AI export, past mistakes appear in context so the model (and you) avoid repeating them.

---

## Routes

| URL | Description |
|-----|-------------|
| `/` | Dashboard — recent activity |
| `/tickers` | List / add tickers |
| `/tickers/{SYMBOL}` | Ticker summary |
| `/tickers/{SYMBOL}/weeks/{yyyy-MM-dd}` | Weekly workbook (`yyyy-MM-dd` = Monday) |
| `/tickers/{SYMBOL}/analysis` | Analysis journal + AI export |
| `/reports` | Compliance and P&L |
| `/earnings` | Coming soon |

**Example:** `http://localhost:3000/tickers/AAPL/weeks/2026-06-02`

---

## Project structure

```
InvestJournal/
├── prisma/schema.prisma    # Database models
├── docker-compose.yml      # MySQL on port 3307
├── .env                    # DATABASE_URL (not committed)
├── src/app/                # Pages (App Router)
├── src/components/         # UI (checklist, analysis, layout)
├── src/server/actions/     # Server Actions (save, export)
├── src/lib/strategy-graph-storage.ts  # Graph files → public/uploads
├── public/uploads/         # Uploaded images (gitignored)
└── src/server/services/    # Business logic (weeks, AI markdown)
```

---

## Strategy graph images (public folder)

Graphs are **not** stored in MySQL as BLOBs.

| What | Where |
|------|--------|
| Image file | `public/uploads/strategies/{strategyId}/graph-....png` |
| DB fields | `strategies.graph_path` (URL path), `graph_file_name` (original name) |
| Served at | `http://localhost:3000/uploads/strategies/...` |

Logic lives in `src/lib/strategy-graph-storage.ts`. Upload/replace/delete in `src/server/actions/strategies.ts`.

**Backup:** copy the `public/uploads` folder together with your MySQL dump.

### Import from Word (`notas-i.docx`)

```powershell
npm run import:strategies -- --docx "C:\dta\mio\notas-i.docx" --only 1
```

- Parses strategy titles and description lines from the docx XML.
- Adds shared **REQUISITOS** / **Confirmación** bullets as `strategy_requirements` rows.
- Saves the first screenshot in each strategy block as a light-mode PNG under `public/uploads/strategies/{id}/`.

Use `--dry-run` to preview without writing. Omit `--only 1` to import every strategy block found.

---

## Data model (summary)

- **tickers** — symbols you follow
- **weeks** + **ticker_weeks** — one checklist workbook per ticker per week
- **weekly_checklist** — items 1–7
- **daily_metrics** — Mon–Fri rows
- **trades** — operation log
- **analysis_entries** — daily journal (NOTE / PREDICTION / MISTAKE)
- **earnings_*** — reserved for future earnings plans

---

## License

Private / internal use (Investep workflow).
