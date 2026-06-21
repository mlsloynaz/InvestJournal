import type {
  StrategyPlaybook,
  StrategyPlaybookRequirement,
  StrategyPlaybookVariant,
} from "@/lib/estrategia-playbook-types";

function normalizeRequirement(raw: unknown): StrategyPlaybookRequirement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const ruleKey = typeof r.ruleKey === "string" ? r.ruleKey.trim() : "";
  const label = typeof r.label === "string" ? r.label.trim() : "";
  const id =
    (typeof r.id === "string" && r.id.trim()) ||
    (typeof r.requirementId === "string" && r.requirementId.trim()) ||
    ruleKey;
  const timeframe = typeof r.timeframe === "string" ? r.timeframe : "15m";
  const automatable =
    r.automatable === "true" || r.automatable === "false" || r.automatable === "partial"
      ? r.automatable
      : "true";
  if (!ruleKey || !label) return null;
  return {
    id,
    label,
    timeframe,
    ruleKey,
    automatable,
    classification:
      r.classification === "mandatory" ||
      r.classification === "support" ||
      r.classification === "execution"
        ? r.classification
        : undefined,
    supportBonusPct: typeof r.supportBonusPct === "number" ? r.supportBonusPct : undefined,
  };
}

function normalizeVariant(raw: unknown): StrategyPlaybookVariant | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const id = typeof v.id === "string" ? v.id.trim() : "";
  const name = typeof v.name === "string" ? v.name.trim() : id;
  const direction = typeof v.direction === "string" ? v.direction : "";
  if (!id) return null;
  const requirements = Array.isArray(v.requirements)
    ? v.requirements.map(normalizeRequirement).filter((r): r is StrategyPlaybookRequirement => r != null)
    : [];
  return { id, name, direction, requirements };
}

/** Normalize playbooks[] from GET /context/strategies (same shape as PUT publish). */
export function normalizePlaybooksFromAws(raw: unknown): StrategyPlaybook[] {
  if (!Array.isArray(raw)) return [];
  const out: StrategyPlaybook[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const id = typeof p.id === "string" ? p.id.trim() : "";
    if (!id) continue;
    const requirements = Array.isArray(p.requirements)
      ? p.requirements.map(normalizeRequirement).filter((r): r is StrategyPlaybookRequirement => r != null)
      : [];
    const variants = Array.isArray(p.variants)
      ? p.variants.map(normalizeVariant).filter((v): v is StrategyPlaybookVariant => v != null)
      : undefined;
    const hasReqs =
      requirements.length > 0 || (variants?.some((v) => v.requirements.length > 0) ?? false);
    if (!hasReqs) continue;
    out.push({
      id,
      title: typeof p.title === "string" ? p.title : id,
      sourceFile: typeof p.sourceFile === "string" ? p.sourceFile : "",
      direction: typeof p.direction === "string" ? p.direction : "",
      mnemonic: typeof p.mnemonic === "string" ? p.mnemonic : undefined,
      timeframes:
        p.timeframes && typeof p.timeframes === "object"
          ? (p.timeframes as StrategyPlaybook["timeframes"])
          : {},
      plans: Array.isArray(p.plans) ? p.plans.map(String) : undefined,
      exits: Array.isArray(p.exits) ? p.exits.map(String) : undefined,
      requirements,
      variants: variants?.length ? variants : undefined,
    });
  }
  return out;
}
