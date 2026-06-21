import { getStrategiesBaseDir } from "@/lib/strategy-markdown";
import { buildPlaybooksFromDocs } from "@/lib/estrategia-playbook-parser";
import type { StrategyPlaybook } from "@/lib/estrategia-playbook-types";
import { buildEstrategiaStrategiesMarkdown } from "@/server/services/estrategia-strategies-export";

export const PLAYBOOKS_VERSION = 2;

/** Source: C:\\dta\\strategies\\estrategia-*.md (full playbooks for Bedrock). */
export async function buildStrategiesMarkdownForFinanceAi(): Promise<string> {
  const { content } = await buildEstrategiaStrategiesMarkdown();
  return content;
}

export async function buildStrategiesPublishPayload(): Promise<{
  filename: string;
  content: string;
  source: string;
  sourceFiles: string[];
  playbooks: StrategyPlaybook[];
  playbooksVersion: number;
}> {
  const { content, sourceFiles, docs } = await buildEstrategiaStrategiesMarkdown();
  const playbooks = await buildPlaybooksFromDocs(docs);
  return {
    filename: "strategies.md",
    content,
    source: getStrategiesBaseDir(),
    sourceFiles,
    playbooks,
    playbooksVersion: PLAYBOOKS_VERSION,
  };
}
