import fs from "fs/promises";
import path from "path";
import { getStrategiesBaseDir } from "@/lib/strategy-markdown";
import type { StrategyPicItem } from "@/lib/strategy-docs-shared";

export {
  rewriteStrategyDocAssetUrl,
  rewriteStrategyDocAssetUrls,
  type StrategyPicItem,
} from "@/lib/strategy-docs-shared";

const DOC_PREFIX = "estrategia-";
const IGNORED_FILES = new Set([
  "estrategias-indice.md",
  "elementos-analisis-temporalidades.md",
  "elementos-analisis-bollinger-bands.md",
  "elementos-analisis-checklist-pre-market.md",
  "elementos-analisis-misc.md",
]);

export type StrategyDocSummary = {
  slug: string;
  filename: string;
  title: string;
};

function isStrategyDocFile(name: string): boolean {
  if (!name.endsWith(".md")) return false;
  if (name.startsWith("strategy-")) return false;
  if (IGNORED_FILES.has(name)) return false;
  return name.startsWith(DOC_PREFIX);
}

export function strategyDocShortSlug(filename: string): string {
  const base = filename.replace(/\.md$/i, "");
  const match = /^estrategia-\d+/.exec(base);
  return match?.[0] ?? base;
}

export function strategyDocFilePath(filename: string): string {
  const base = getStrategiesBaseDir();
  const resolved = path.resolve(base, filename);
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error("Invalid strategy doc path");
  }
  return resolved;
}

async function readMarkdownTextFile(filePath: string): Promise<string> {
  const bytes = await fs.readFile(filePath);
  const utf8 = bytes.toString("utf8");
  if (!utf8.includes("\uFFFD")) return utf8;
  try {
    return new TextDecoder("windows-1252").decode(bytes);
  } catch {
    return bytes.toString("latin1");
  }
}

export async function resolveStrategyDocFilename(slug: string): Promise<string | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const base = getStrategiesBaseDir();
  let entries: string[];
  try {
    entries = await fs.readdir(base);
  } catch {
    return null;
  }

  const docs = entries.filter(isStrategyDocFile);
  const exact = `${normalized}.md`;
  if (docs.includes(exact)) return exact;

  const prefixMatches = docs.filter(
    (name) => name.replace(/\.md$/i, "") === normalized || name.startsWith(`${normalized}-`)
  );
  if (prefixMatches.length === 1) return prefixMatches[0];
  if (prefixMatches.length > 1) {
    prefixMatches.sort((a, b) => a.localeCompare(b));
    return prefixMatches[0];
  }

  return null;
}

function extractTitle(markdown: string, fallback: string): string {
  const match = /^#\s+(.+)$/m.exec(markdown);
  return match?.[1]?.trim() || fallback;
}

export async function readStrategyDoc(slug: string): Promise<{
  slug: string;
  filename: string;
  title: string;
  markdown: string;
} | null> {
  const filename = await resolveStrategyDocFilename(slug);
  if (!filename) return null;

  try {
    const markdown = await readMarkdownTextFile(strategyDocFilePath(filename));
    const shortSlug = strategyDocShortSlug(filename);
    return {
      slug: shortSlug,
      filename,
      title: extractTitle(markdown, shortSlug),
      markdown,
    };
  } catch {
    return null;
  }
}

export async function readStrategyAllDoc(): Promise<{
  filename: string;
  title: string;
  markdown: string;
} | null> {
  const filename = "strategyall.md";
  try {
    const markdown = await readMarkdownTextFile(strategyDocFilePath(filename));
    return {
      filename,
      title: extractTitle(markdown, "Strategy All"),
      markdown,
    };
  } catch {
    return null;
  }
}

export async function listStrategyDocs(): Promise<StrategyDocSummary[]> {
  const base = getStrategiesBaseDir();
  let entries: string[];
  try {
    entries = await fs.readdir(base);
  } catch {
    return [];
  }

  const summaries: StrategyDocSummary[] = [];
  for (const filename of entries.filter(isStrategyDocFile)) {
    try {
      const markdown = await readMarkdownTextFile(strategyDocFilePath(filename));
      const slug = strategyDocShortSlug(filename);
      summaries.push({
        slug,
        filename,
        title: extractTitle(markdown, slug),
      });
    } catch {
      /* skip unreadable */
    }
  }

  summaries.sort((a, b) => a.slug.localeCompare(b.slug));
  return summaries;
}

const STRATEGY_PIC_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

const TIMEFRAME_SORT: Record<string, number> = {
  Dia: 0,
  Hora: 1,
  "15 min": 2,
  Chart: 3,
};

function parseStrategyPicMeta(
  filename: string,
  prefix: string
): Pick<StrategyPicItem, "label" | "timeframe"> {
  const stem = filename.slice(prefix.length).replace(/\.[^.]+$/i, "");
  const lower = stem.toLowerCase();

  let timeframe = "Chart";
  if (/(^|-)15m($|-)/.test(lower)) timeframe = "15 min";
  else if (/(^|-)1h($|-)/.test(lower)) timeframe = "Hora";
  else if (/(^|-)d($|-)/.test(lower) || lower.includes("-d-")) timeframe = "Dia";

  const topic = lower
    .replace(/^(alza|baja)-/, "")
    .replace(/(^|-)(15m|1h|d)($|-)/g, "-")
    .replace(/^-|-$/g, "");

  const topicMap: Record<string, string> = {
    rebote: "Rebote punto medio",
    cambiot: "Cambio de Tendencia Bolinger H",
    iman: "Efecto iman",
    "lateral-salto": "Lateral + salto apertura",
    lateral: "Lateral + salto",
  };

  let label = topicMap[topic];
  if (!label) {
    label = topic
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  if (!label.trim()) {
    label = stem
      .split("-")
      .filter((part) => !/^(alza|baja)$/i.test(part))
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return { label: label || "Grafico", timeframe };
}

export async function readStrategyPics(slug: string): Promise<StrategyPicItem[]> {
  const match = /^estrategia-(\d+)$/.exec(slug.trim().toLowerCase());
  if (!match) return [];

  const prefix = `${match[1].padStart(2, "0")}-`;
  const picsDir = path.join(getStrategiesBaseDir(), "pics");

  let entries: string[];
  try {
    entries = await fs.readdir(picsDir);
  } catch {
    return [];
  }

  const items: StrategyPicItem[] = [];
  for (const name of entries) {
    if (!name.startsWith(prefix)) continue;
    const ext = path.extname(name).toLowerCase();
    if (!STRATEGY_PIC_EXTENSIONS.has(ext)) continue;

    const full = path.join(picsDir, name);
    try {
      const stat = await fs.stat(full);
      if (!stat.isFile()) continue;
    } catch {
      continue;
    }

    const meta = parseStrategyPicMeta(name, prefix);
    items.push({
      file: `pics/${name}`,
      filename: name,
      label: meta.label,
      timeframe: meta.timeframe,
    });
  }

  items.sort((a, b) => {
    const ta = TIMEFRAME_SORT[a.timeframe] ?? 9;
    const tb = TIMEFRAME_SORT[b.timeframe] ?? 9;
    if (ta !== tb) return ta - tb;
    return a.filename.localeCompare(b.filename);
  });
  return items;
}

export type StrategyCardItem = {
  id: string;
  file: string;
  variant: string;
  title: string;
  subtitle: string;
  checks: string[];
};

export type StrategyCardSection = {
  key: string;
  title: string;
  dir: string;
  items: StrategyCardItem[];
};

export type StrategyCardGallery = {
  sections: StrategyCardSection[];
};

export async function readStrategyCardGallery(slug: string): Promise<StrategyCardGallery | null> {
  const normalized = slug.trim().toLowerCase();
  const match = /^estrategia-(\d+)$/.exec(normalized);
  if (!match) return null;

  const manifestPath = path.join(
    getStrategiesBaseDir(),
    "pics",
    `estrategia-${match[1]}`,
    "cards",
    "manifest.json"
  );

  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as StrategyCardGallery;
    if (!parsed.sections?.length) return null;
    const sections = parsed.sections.filter((s) => s.items?.length > 0);
    return sections.length ? { sections } : null;
  } catch {
    return null;
  }
}

export async function readStrategyDocAsset(relativePath: string): Promise<{
  bytes: Buffer;
  contentType: string;
} | null> {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return null;

  const base = path.resolve(getStrategiesBaseDir());
  const full = path.resolve(base, normalized);
  if (!full.startsWith(base)) return null;

  try {
    const bytes = await fs.readFile(full);
    const ext = path.extname(full).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".gif"
            ? "image/gif"
            : ext === ".webp"
              ? "image/webp"
              : ext === ".svg"
                ? "image/svg+xml"
                : "application/octet-stream";
    return { bytes, contentType };
  } catch {
    return null;
  }
}
