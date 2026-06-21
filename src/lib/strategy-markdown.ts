import path from "path";

export type StrategyMarkdownContent = {
  graph: string;
  requirements: string[];
  bestFor: string;
  commonMistake: string;
};

const SECTION_GRAPH = "## Gráfico";
const SECTION_REQUIREMENTS = "## Requisitos";
const SECTION_BEST_FOR = "## Mejor para";
const SECTION_COMMON_MISTAKE = "## Error común";

export const DEFAULT_STRATEGIES_MD_DIR = "C:\\dta\\strategies";

export function getStrategiesBaseDir(): string {
  const fromEnv = process.env.STRATEGIES_MD_DIR?.trim();
  return fromEnv || DEFAULT_STRATEGIES_MD_DIR;
}

export function strategyMarkdownFilePath(strategyId: number, customPath?: string | null): string {
  if (customPath?.trim()) return customPath.trim();
  return path.join(getStrategiesBaseDir(), `strategy-${strategyId}.md`);
}

export function strategyImagesDir(strategyId: number): string {
  return path.join(getStrategiesBaseDir(), `strategy-${strategyId}`, "images");
}

export function defaultStrategyMarkdown(name: string): string {
  return serializeStrategyMarkdown({
    graph: "",
    requirements: [],
    bestFor: "",
    commonMistake: "",
  }, name);
}

export function serializeStrategyMarkdown(
  content: StrategyMarkdownContent,
  title: string
): string {
  const reqLines =
    content.requirements.length > 0
      ? content.requirements.map((r) => `- ${r}`).join("\n")
      : "- ";

  return `# ${title}

${SECTION_GRAPH}

${content.graph.trim() || "_Sin gráfico._"}

${SECTION_REQUIREMENTS}

${reqLines}

${SECTION_BEST_FOR}

${content.bestFor.trim() || "_Sin descripción._"}

${SECTION_COMMON_MISTAKE}

${content.commonMistake.trim() || "_Sin notas._"}
`;
}

function sectionBody(source: string, heading: string, nextHeadings: string[]): string {
  const start = source.indexOf(heading);
  if (start === -1) return "";

  let contentStart = start + heading.length;
  if (source[contentStart] === "\r") contentStart++;
  if (source[contentStart] === "\n") contentStart++;

  let end = source.length;
  for (const next of nextHeadings) {
    const idx = source.indexOf(next, contentStart);
    if (idx !== -1 && idx < end) end = idx;
  }

  return source.slice(contentStart, end).trim();
}

function parseRequirements(block: string): string[] {
  const lines = block.split(/\r?\n/);
  const items: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+(.+)$/);
    if (m) {
      const text = m[1].trim();
      if (text && text !== "_Sin requisitos._") items.push(text);
    }
  }
  return items;
}

function stripPlaceholder(text: string): string {
  const t = text.trim();
  if (t === "_Sin gráfico._" || t === "_Sin descripción._" || t === "_Sin notas._") return "";
  return t;
}

export function parseStrategyMarkdown(source: string): StrategyMarkdownContent {
  const graph = stripPlaceholder(
    sectionBody(source, SECTION_GRAPH, [
      SECTION_REQUIREMENTS,
      SECTION_BEST_FOR,
      SECTION_COMMON_MISTAKE,
    ])
  );
  const reqBlock = sectionBody(source, SECTION_REQUIREMENTS, [
    SECTION_BEST_FOR,
    SECTION_COMMON_MISTAKE,
  ]);
  const bestFor = stripPlaceholder(
    sectionBody(source, SECTION_BEST_FOR, [SECTION_COMMON_MISTAKE])
  );
  const commonMistake = stripPlaceholder(sectionBody(source, SECTION_COMMON_MISTAKE, []));

  return {
    graph,
    requirements: parseRequirements(reqBlock),
    bestFor,
    commonMistake,
  };
}
