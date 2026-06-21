import fs from "fs/promises";
import { getStrategiesBaseDir } from "@/lib/strategy-markdown";
import {
  extractEntryLine,
  extractExitLine,
  extractTimeframesLine,
} from "@/lib/estrategia-md-extract";
import { listStrategyDocs, strategyDocFilePath } from "@/lib/strategy-docs";
import type { EstrategiaDocForExport } from "@/lib/estrategia-playbook-types";

export type { EstrategiaDocForExport };

/** Replace local chart images with text captions (Bedrock has no file access). */
export function stripImagesForBedrock(markdown: string): string {
  return markdown.replace(/!\[([^\]]*)\]\([^)]+\)/g, (_full, alt: string) => {
    const label = alt?.trim();
    return label ? `[Chart reference: ${label}]` : "[Chart reference]";
  });
}

export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+.+\r?\n+/, "");
}

export function wrapEstrategiaForBedrock(doc: EstrategiaDocForExport): string {
  const body = stripImagesForBedrock(stripLeadingH1(doc.markdown)).trim();
  const timeframes = extractTimeframesLine(doc.markdown);
  const entry = extractEntryLine(doc.markdown);
  const exit = extractExitLine(doc.markdown);

  return `## Strategy: ${doc.title}

- **ID:** ${doc.slug}
- **Source file:** ${doc.filename}
- **Timeframes:** ${timeframes}
- **Entry:** ${entry}
- **Exit:** ${exit}
- **Risk:** Ver invalidación, exposición 15m y checklist pre-market en el playbook.

### Playbook

${body}`;
}

export async function listEstrategiaDocsForExport(): Promise<EstrategiaDocForExport[]> {
  const summaries = await listStrategyDocs();
  const docs: EstrategiaDocForExport[] = [];

  for (const summary of summaries) {
    try {
      const markdown = await fs.readFile(strategyDocFilePath(summary.filename), "utf8");
      docs.push({
        slug: summary.slug,
        filename: summary.filename,
        title: summary.title,
        markdown,
      });
    } catch {
      /* skip unreadable */
    }
  }

  return docs;
}

export async function buildEstrategiaStrategiesMarkdown(): Promise<{
  content: string;
  sourceFiles: string[];
  docs: EstrategiaDocForExport[];
}> {
  const docs = await listEstrategiaDocsForExport();
  if (docs.length === 0) {
    throw new Error(
      `No hay archivos estrategia-*.md en ${getStrategiesBaseDir()}. Agrega playbooks en esa carpeta.`
    );
  }

  const blocks = [
    "# Trading Strategies",
    "",
    `_Publicado desde ${getStrategiesBaseDir()}. Imágenes locales convertidas a referencias de texto._`,
    "",
    ...docs.flatMap((doc) => [wrapEstrategiaForBedrock(doc), ""]),
  ];

  return {
    content: blocks.join("\n").trim(),
    sourceFiles: docs.map((d) => d.filename),
    docs,
  };
}
