# InvestJournal — local save only

**Folder:** `C:\Code\InvestJournal`  
**No remote, no push** — everything stays on this PC.

## After you change code

```bat
node scripts\save-local.mjs
```

Or double-click `scripts\save-local.cmd`.

## Check last save

```bat
cd C:\Code\InvestJournal
git log -1 --oneline
```

## First save (already done)

Commit `e3bea31` — docs, calc sidebar, analysis elements, pre-market checklist, Bollinger views.

## Do not

- Do not run `git push` unless you add your own remote later.
- `.env` is not in git (secrets stay local).
