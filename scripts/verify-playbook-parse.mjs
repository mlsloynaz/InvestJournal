/**
 * Audit estrategia-*.md → ruleKey mapping (run: node scripts/verify-playbook-parse.mjs)
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const strategiesDir = process.env.STRATEGIES_DIR || "c:\\dta\\strategies";

const REQ_HEADING = /^##\s+(?:Los\s+\d+\s+requisitos|Requisitos\s+\(obligatorios\))\s*$/im;

function inferTimeframe(label) {
  if (/15\s*min/i.test(label)) return "15m";
  if (/\bHORA\b|hora\b|1h/i.test(label)) return "1h";
  if (/\bD[IÍ]A\b|\bd[ií]a\b/i.test(label)) return "D";
  return "1h";
}

function inferRuleKey(num, label, timeframe) {
  const t = label.toLowerCase();
  if (/worden|stoch|volumen/.test(t)) return "volume_stoch_hour";
  if (/ruptura de l[ií]nea|rompe.*l[ií]nea de tendencia/.test(t)) return "trendline_break";
  if (/l[ií]nea de tendencia|trendline/.test(t)) return "trendline";
  if (/lateral/.test(t) && /bollinger|bb/.test(t)) return "bb_lateral_squeeze";
  if (/volatil/.test(t) && (/abiert|expand|disipador/.test(t))) {
    return "vol_bb_expand";
  }
  if (/completamente fuera|100% fuera|fuera de bollinger|fuera del oscilador/i.test(label)) {
    return "bb_exposure";
  }
  if (/tendencia/.test(t) && /separ[aá]ndose|ma\s*20\s*(?:y|\/)\s*40/i.test(t)) {
    return "ma_separation_1h";
  }
  if (/tendencia/.test(t) && timeframe === "D") return "trend_daily";
  if (/tendencia/.test(t)) return "trend_1h";
  if (/separ[aá]ndose|ma\s*20\s*(?:y|\/)\s*40/i.test(t)) return "ma_separation_1h";
  if (/salto|gap/.test(t) && /lejos.*ma\s*20/i.test(label)) return "gap_far_from_ma20_1h";
  if (/gap|salto|apertura/.test(t)) return "gap_open";
  if (/baja hacia|sube hacia|acercamiento/i.test(label)) return "daily_ma_interaction";
  if (/rebote/.test(t) && timeframe === "15m") return "bb_mid_15m";
  if (/toca|respeta/.test(t)) return "level_respect";
  if (/vela.*hora|hora completa/.test(t)) return "hourly_candle_confirm";
  if (/ruptura.*bollinger|ruptura.*punto medio/i.test(t)) return "bb_mid_1h";
  if (/punto medio|bollinger|bb/.test(t)) {
    if (timeframe === "D") return "bb_mid_daily";
    if (timeframe === "15m") return "bb_mid_15m";
    return "bb_mid_1h";
  }
  if (/primeros\s*5\s*minutos|primeros\s*5\s*min/i.test(label)) return "opening_window_5m";
  if (/CALL|PUT|broker|vencimiento/.test(t)) return "options_execution";
  return `req_${num}`;
}

function slugifyVariant(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function variantIdFor(slug, headerLine) {
  const directionMatch = /\((CALL|PUT[^)]*)\)\s*$/i.exec(headerLine);
  const name = headerLine.replace(/\s*\([^)]+\)\s*$/, "").trim();
  return `${slug}-${slugifyVariant(name || directionMatch?.[1] || "variant")}`;
}
function parseReqs(section, prefix) {
  const reqs = [];
  const headingRe = /^###\s+(\d+)\s+—\s+(.+)$/gm;
  let m;
  while ((m = headingRe.exec(section)) !== null) {
    const label = m[2].trim();
    const tf = inferTimeframe(label);
    reqs.push({ num: m[1], label, tf, ruleKey: inferRuleKey(m[1], label, tf) });
  }
  if (reqs.length) return reqs;
  const listRe = /^(\d+)\.\s+(.+)$/gm;
  while ((m = listRe.exec(section)) !== null) {
    const label = m[2].trim();
    const tf = inferTimeframe(label);
    reqs.push({ num: m[1], label, tf, ruleKey: inferRuleKey(m[1], label, tf) });
  }
  return reqs;
}

const files = (await fs.readdir(strategiesDir)).filter((f) => /^estrategia-\d+.*\.md$/i.test(f));
let errors = 0;
for (const file of files.sort()) {
  const md = await fs.readFile(path.join(strategiesDir, file), "utf8");
  const slug = file.replace(/\.md$/i, "").match(/estrategia-\d+/)?.[0];
  console.log(`\n=== ${slug} ===`);
  const parts = md.split(/^# Variante /m);
  if (parts.length > 1) {
    for (const part of parts.slice(1)) {
      const header = part.split("\n")[0].trim();
      const start = REQ_HEADING.exec(part);
      const sec = start ? part.slice(start.index + start[0].length) : "";
      const end = sec.search(/^##\s+(?!###)/m);
      const reqs = parseReqs(end === -1 ? sec : sec.slice(0, end), slug);
      const vid = variantIdFor(slug, header);
      console.log(`  ${header} (${reqs.length} reqs) · ${vid}`);
      for (const r of reqs) {
        console.log(`    ${r.num}. [${r.tf}|${r.ruleKey}] ${r.label.slice(0, 60)}`);
      }
      if (reqs.length === 0) {
        console.log("    ERROR: no requirements parsed");
        errors++;
      }
    }
  } else {
    const start = REQ_HEADING.exec(md);
    const sec = start ? md.slice(start.index + start[0].length) : "";
    const end = sec.search(/^##\s+(?!###)/m);
    const reqs = parseReqs(end === -1 ? sec : sec.slice(0, end), slug);
    console.log(`  single (${reqs.length} reqs)`);
    for (const r of reqs) {
      console.log(`    ${r.num}. [${r.tf}|${r.ruleKey}] ${r.label.slice(0, 60)}`);
    }
  }
}
console.log(`\nDone. Parse errors: ${errors}`);
process.exit(errors > 0 ? 1 : 0);
