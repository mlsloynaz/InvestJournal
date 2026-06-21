import type { AnalysisElement, AnalysisSection } from "@/data/analysis-elements";
import { getAnalysisElement } from "@/data/analysis-elements";

function stripMd(text: string): string {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function renderSection(section: AnalysisSection): string {
  switch (section.type) {
    case "intro":
      return `${stripMd(section.text)}\n\n`;
    case "callout":
      return `**${section.title}:** ${stripMd(section.text)}\n\n`;
    case "bullets":
      return `### ${section.title}\n${section.items.map((i) => `- ${stripMd(i)}`).join("\n")}\n\n`;
    case "steps":
      return `### ${section.title}\n${section.items.map((i, n) => `${n + 1}. ${stripMd(i)}`).join("\n")}\n\n`;
    case "table":
      return `### ${section.title}\n| ${section.headers.join(" | ")} |\n| ${section.headers.map(() => "---").join(" | ")} |\n${section.rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n\n`;
    case "cards":
      return `### ${section.title}\n${section.cards
        .map(
          (c) =>
            `- **${c.title}**${c.subtitle ? ` (${c.subtitle})` : ""}: ${stripMd(c.body)}${c.items?.length ? `\n  ${c.items.map((i) => `- ${stripMd(i)}`).join("\n  ")}` : ""}`
        )
        .join("\n")}\n\n`;
    case "diagram":
      return `### ${section.title}\n_(diagrama: ${section.diagram})_\n\n`;
    default:
      return "";
  }
}

function renderElement(element: AnalysisElement): string {
  const parts = [`### ${element.title}`, element.tagline ? `_${stripMd(element.tagline)}_` : ""];
  if (element.timeframes) parts.push(`**Temporalidades:** ${element.timeframes}`);
  parts.push("");
  for (const section of element.sections) {
    parts.push(renderSection(section));
  }
  return parts.filter(Boolean).join("\n").trim();
}

function elementBlock(slug: string): string {
  const el = getAnalysisElement(slug);
  if (!el) return "";
  return renderElement(el);
}

/** Source: src/data/analysis-elements.ts rendered to Bedrock-oriented markdown. */
export function buildAnalysisFrameworkMarkdownForFinanceAi(): string {
  const temporalidades = elementBlock("temporalidades");
  const medias = elementBlock("medias-moviles");
  const bollinger = elementBlock("bollinger-bands");
  const checklist = elementBlock("checklist-pre-market");

  if (!temporalidades || !checklist) {
    throw new Error("Faltan elementos de análisis requeridos (temporalidades / checklist).");
  }

  const indicatorSlugs = ["medias-moviles", "bollinger-bands", "volumen", "worden-stochastic"];
  const indicatorBlocks = indicatorSlugs
    .map((slug) => elementBlock(slug))
    .filter(Boolean)
    .join("\n\n");

  return `# Analysis Framework

## Temporalidades

${temporalidades}

## Indicators

${indicatorBlocks || medias || bollinger || "_Sin indicadores._"}

## Pre-market checklist

${checklist}
`.trim();
}

export function buildAnalysisFrameworkPublishPayload(): {
  filename: string;
  content: string;
  source: string;
} {
  return {
    filename: "analysis-framework.md",
    content: buildAnalysisFrameworkMarkdownForFinanceAi(),
    source: "InvestJournal",
  };
}
