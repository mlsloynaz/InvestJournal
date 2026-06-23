import fs from "fs/promises";

import path from "path";

import type {

  EstrategiaDocForExport,

  PlaybookAutomatable,

  StrategyPlaybook,

  StrategyPlaybookRequirement,

  StrategyPlaybookVariant,

} from "@/lib/estrategia-playbook-types";

import { getStrategiesBaseDir } from "@/lib/strategy-markdown";

import { extractTimeframesLine } from "@/lib/estrategia-md-extract";



const REQ_HEADING = /^##\s+(?:Los\s+\d+\s+requisitos|Requisitos\s+\(obligatorios\))\s*$/im;



function extractDirection(title: string): string {

  const paren = /\(([^)]+)\)\s*$/.exec(title);

  if (paren?.[1]) {

    return paren[1].replace(/\s+/g, " ").trim();

  }

  if (/\bPUT\b/i.test(title) && /\bCALL\b/i.test(title)) return "CALL / PUT";

  if (/\bPUT\b/i.test(title)) return "PUT";

  if (/\bCALL\b/i.test(title)) return "CALL";

  return "—";

}



function extractMnemonic(markdown: string): string | undefined {

  const block = /##\s+Mnemot[eé]cnicos?\s*\n+([^\n#|][^\n]*)/i.exec(markdown);

  const line = block?.[1]?.trim();

  return line || undefined;

}



function extractPlans(markdown: string): string[] {

  const resumen = /## Resumen[\s\S]*?\*\*Plan:\*\*\s*([^\n·]+)/i.exec(markdown);

  if (!resumen?.[1]) return [];

  return resumen[1]

    .split(/[,;]/)

    .map((p) => p.trim())

    .filter(Boolean);

}



function extractExits(markdown: string): string[] {

  const exits: string[] = [];

  if (/MA\s*40|Ma\s*40/i.test(markdown)) exits.push("ma40");

  if (/H-Line|edge line/i.test(markdown)) exits.push("h_line");

  if (/disipador/i.test(markdown)) exits.push("bollinger_dissipator");

  if (/punto medio/i.test(markdown)) exits.push("bb_middle");

  return exits.length ? exits : ["see_playbook"];

}



function inferTimeframe(label: string): string {

  if (/15\s*min/i.test(label)) return "15m";

  if (/\bHORA\b|hora\b|1h/i.test(label)) return "1h";

  if (/\bDÍA\b|\bd[ií]a\b/i.test(label)) return "D";

  if (/broker|vencimiento|spread|ATM|ejecuci/i.test(label)) return "execution";

  return "1h";

}



/** Map playbook requirement labels to FinanceAI ruleKey (order matters). */

export function inferRuleKey(num: string, label: string, timeframe: string): string {

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

  if (/expuesto|fuera de bollinger/i.test(t)) return "bb_exposure";

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



function inferAutomatable(ruleKey: string, label: string): PlaybookAutomatable {

  if (ruleKey === "options_execution") return "false";

  if (

    ruleKey === "trendline" ||

    ruleKey === "trendline_break" ||

    ruleKey === "hourly_candle_confirm" ||

    ruleKey === "volume_stoch_hour" ||

    ruleKey === "clean_path_movement" ||

    ruleKey === "clean_path_ma20_1h" ||

    ruleKey === "level_respect" ||

    ruleKey === "approach_daily_ma20" ||

    ruleKey === "daily_ma_interaction" ||

    ruleKey === "ma_cut_daily" ||

    ruleKey === "opening_window_5m" ||

    ruleKey === "gap_far_from_ma20_1h"

  ) {

    return "partial";

  }

  if (/vela.*completa|l[ií]nea de tendencia|worden|stoch|relativo|extremadamente lejos/i.test(label)) {

    return "partial";

  }

  return "true";

}



const SUPPORT_HEADING = /^##\s+Confirmaciones extra/im;

const SUPPORT_TABLE_RULES: Record<string, { ruleKey: string; timeframe: string }> = {
  "camino limpio": { ruleKey: "clean_path_movement", timeframe: "1h" },
  "más fuerza": { ruleKey: "bb_exposure_strength_1h", timeframe: "1h" },
  "multi-tf": { ruleKey: "bb_exposure_multi_tf", timeframe: "1h" },
};

const CLEAN_PATH_RULE_KEYS = new Set(["clean_path_movement", "clean_path_ma20_1h"]);

const UNIVERSAL_MOVEMENT_SUPPORT: Omit<StrategyPlaybookRequirement, "id"> = {
  label: "Camino limpio",
  timeframe: "1h",
  ruleKey: "clean_path_movement",
  automatable: "partial",
  classification: "support",
  supportBonusPct: 5,
};

function inferSupportRuleKey(label: string, timeframe: string): string {
  const t = label.toLowerCase();
  if (/volatil/.test(t) && /bollinger|disipador/.test(t)) return "vol_bb_expand";
  if (/convergiendo|converg/.test(t)) return "ma_convergence_1h";
  if (/vela.*hora.*clara|hora clara/.test(t)) return "hourly_candle_clear_1h";
  if (/no expuesto|expuesto.*15/.test(t)) return "not_exposed_15m_entry";
  if (/camino limpio/.test(t)) return "clean_path_movement";
  if (/más fuerza|mas fuerza/.test(t)) return "bb_exposure_strength_1h";
  if (/multi-tf|multi tf/.test(t)) return "bb_exposure_multi_tf";
  return inferRuleKey("e", label, timeframe);
}

function extractSupportSection(block: string): string {
  const start = SUPPORT_HEADING.exec(block);
  if (!start || start.index === undefined) return "";
  const from = start.index + start[0].length;
  const rest = block.slice(from);
  const end = rest.search(/^##\s+(?!###)/m);
  return end === -1 ? rest : rest.slice(0, end);
}

function parseSupportRequirements(section: string, prefix: string): StrategyPlaybookRequirement[] {
  const reqs: StrategyPlaybookRequirement[] = [];
  if (!section.trim()) return reqs;

  const headingRe = /^###\s+(E\d+)\s+—\s+(.+)$/gim;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(section)) !== null) {
    const extId = match[1].toLowerCase();
    const heading = match[2].trim();
    const ruleFromTicks = /`([a-z0-9_]+)`/.exec(heading)?.[1];
    const label = heading.replace(/\s*\(`[^`]+`\)\s*$/, "").trim();
    const timeframe = /@\s*([\w]+)/i.exec(section.slice(match.index, match.index + 400))?.[1] ?? inferTimeframe(label);
    const ruleKey = ruleFromTicks ?? inferSupportRuleKey(label, timeframe);
    reqs.push({
      id: `${prefix}-${extId}`,
      label,
      timeframe: timeframe === "H" ? "1h" : timeframe,
      ruleKey,
      automatable: inferAutomatable(ruleKey, label),
      classification: "support",
      supportBonusPct: 5,
    });
  }

  if (reqs.length > 0) return reqs;

  const rowRe = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm;
  while ((match = rowRe.exec(section)) !== null) {
    const tema = match[1].trim().toLowerCase();
    if (tema === "tema" || tema.startsWith("---")) continue;
    const mapped = SUPPORT_TABLE_RULES[tema];
    if (!mapped) continue;
    const extId = `e${reqs.length + 1}`;
    reqs.push({
      id: `${prefix}-${extId}`,
      label: match[1].trim(),
      timeframe: mapped.timeframe,
      ruleKey: mapped.ruleKey,
      automatable: inferAutomatable(mapped.ruleKey, match[1]),
      classification: "support",
      supportBonusPct: 5,
    });
  }

  return reqs;
}

function normalizeCleanPathRuleKey(ruleKey: string | undefined): string | undefined {
  if (ruleKey === "clean_path_ma20_1h") return "clean_path_movement";
  return ruleKey;
}

function injectUniversalMovementSupport(
  strategyId: string,
  variants: StrategyPlaybookVariant[] | undefined
): void {
  if (!variants?.length || !/^estrategia-0[1-4]$/.test(strategyId)) return;
  for (const variant of variants) {
    for (const req of variant.requirements) {
      if (req.ruleKey) {
        req.ruleKey = normalizeCleanPathRuleKey(req.ruleKey) ?? req.ruleKey;
      }
    }
    const hasCleanPath = variant.requirements.some((r) =>
      CLEAN_PATH_RULE_KEYS.has(r.ruleKey ?? "")
    );
    if (hasCleanPath) continue;
    variant.requirements.push({
      ...UNIVERSAL_MOVEMENT_SUPPORT,
      id: `${variant.id}-clean-path`,
    });
  }
}

function mergeSharedSupportRequirements(
  markdown: string,
  strategyId: string,
  variants: StrategyPlaybookVariant[]
): void {
  if (variants.length === 0) return;
  const sharedBlock = extractSupportSection(markdown);
  if (!sharedBlock.includes("CALL y PUT") && !sharedBlock.includes("Aplica a")) {
    return;
  }
  const shared = parseSupportRequirements(sharedBlock, strategyId);
  if (shared.length === 0) return;
  for (const variant of variants) {
    const existing = new Set(variant.requirements.map((r) => r.ruleKey));
    for (const req of shared) {
      if (existing.has(req.ruleKey)) continue;
      variant.requirements.push({
        ...req,
        id: `${variant.id}-${req.id.split("-").pop() ?? req.ruleKey}`,
      });
    }
  }
}



function parseNumberedRequirements(section: string, prefix: string): StrategyPlaybookRequirement[] {

  const reqs: StrategyPlaybookRequirement[] = [];

  const headingRe = /^###\s+(\d+)\s+—\s+(.+)$/gm;

  let match: RegExpExecArray | null;

  while ((match = headingRe.exec(section)) !== null) {

    const num = match[1];

    const label = match[2].trim();

    const timeframe = inferTimeframe(label);

    const ruleKey = inferRuleKey(num, label, timeframe);

    if (ruleKey === "options_execution") continue;

    reqs.push({

      id: `${prefix}-req${num}`,

      label,

      timeframe,

      ruleKey,

      automatable: inferAutomatable(ruleKey, label),

      classification: "mandatory",

    });

  }

  if (reqs.length > 0) return reqs;



  const listRe = /^(\d+)\.\s+(.+)$/gm;

  while ((match = listRe.exec(section)) !== null) {

    const num = match[1];

    const label = match[2].trim().replace(/\s*→\s*(CALL|PUT)\s*$/i, "").trim();

    const timeframe = inferTimeframe(label);

    const ruleKey = inferRuleKey(num, label, timeframe);

    if (ruleKey === "options_execution") continue;

    reqs.push({

      id: `${prefix}-req${num}`,

      label,

      timeframe,

      ruleKey,

      automatable: inferAutomatable(ruleKey, label),

      classification: "mandatory",

    });

  }

  return reqs;

}



function extractRequirementsSection(block: string): string {

  const start = REQ_HEADING.exec(block);

  if (!start || start.index === undefined) return "";

  const from = start.index + start[0].length;

  const rest = block.slice(from);

  const end = rest.search(/^##\s+(?!###)/m);

  return end === -1 ? rest : rest.slice(0, end);

}



function slugifyVariant(name: string): string {

  return name

    .toLowerCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/^-|-$/g, "");

}



function parseVariants(

  markdown: string,

  strategyId: string

): StrategyPlaybookVariant[] | undefined {

  if (!/^# Variante /m.test(markdown)) return undefined;



  const parts = markdown.split(/^# Variante /m).slice(1);

  const variants: StrategyPlaybookVariant[] = [];



  for (const part of parts) {

    const headerLine = part.split("\n")[0]?.trim() ?? "";

    const directionMatch = /\((CALL|PUT[^)]*)\)\s*$/i.exec(headerLine);

    const direction = directionMatch?.[1]?.trim() ?? extractDirection(headerLine);

    const name = headerLine.replace(/\s*\([^)]+\)\s*$/, "").trim();

    const variantId = `${strategyId}-${slugifyVariant(name || direction)}`;

    const reqSection = extractRequirementsSection(part);

    const supportSection = extractSupportSection(part);

    const requirements = [
      ...parseNumberedRequirements(reqSection, variantId),
      ...parseSupportRequirements(supportSection, variantId),
    ];

    if (requirements.length === 0) continue;

    variants.push({

      id: variantId,

      name: name || headerLine,

      direction,

      requirements,

    });

  }



  return variants.length ? variants : undefined;

}



export function parseEstrategiaPlaybook(doc: EstrategiaDocForExport): StrategyPlaybook {

  const tfLine = extractTimeframesLine(doc.markdown);

  const variants = parseVariants(doc.markdown, doc.slug);

  if (variants?.length) {
    mergeSharedSupportRequirements(doc.markdown, doc.slug, variants);
    injectUniversalMovementSupport(doc.slug, variants);
  }

  const mainReqSection = extractRequirementsSection(doc.markdown);

  const mainRequirements = variants

    ? []

    : parseNumberedRequirements(mainReqSection, doc.slug);



  return {

    id: doc.slug,

    title: doc.title,

    sourceFile: doc.filename,

    direction: extractDirection(doc.title),

    mnemonic: extractMnemonic(doc.markdown),

    timeframes: {

      summary: tfLine,

      confirm: /hora|1h/i.test(tfLine) ? "1h" : undefined,

      entry: /15\s*min/i.test(tfLine) ? "15m" : undefined,

      context: /d[ií]a/i.test(tfLine) ? ["D"] : undefined,

    },

    plans: extractPlans(doc.markdown),

    exits: extractExits(doc.markdown),

    requirements: mainRequirements,

    variants,

  };

}



export async function loadPlaybookOverride(slug: string): Promise<Partial<StrategyPlaybook> | null> {

  const filePath = path.join(getStrategiesBaseDir(), "playbooks", `${slug}.json`);

  try {

    const raw = await fs.readFile(filePath, "utf8");

    return JSON.parse(raw) as Partial<StrategyPlaybook>;

  } catch {

    return null;

  }

}



export function mergePlaybookWithOverride(

  parsed: StrategyPlaybook,

  override: Partial<StrategyPlaybook> | null

): StrategyPlaybook {

  if (!override) return parsed;

  return {

    ...parsed,

    ...override,

    id: override.id ?? parsed.id,

    requirements: override.requirements ?? parsed.requirements,

    variants: override.variants ?? parsed.variants,

    timeframes: { ...parsed.timeframes, ...override.timeframes },

    plans: override.plans ?? parsed.plans,

    exits: override.exits ?? parsed.exits,

  };

}



export async function buildPlaybooksFromDocs(

  docs: EstrategiaDocForExport[]

): Promise<StrategyPlaybook[]> {

  const playbooks: StrategyPlaybook[] = [];

  for (const doc of docs) {

    const parsed = parseEstrategiaPlaybook(doc);

    const override = await loadPlaybookOverride(doc.slug);

    playbooks.push(mergePlaybookWithOverride(parsed, override));

  }

  return playbooks;

}


