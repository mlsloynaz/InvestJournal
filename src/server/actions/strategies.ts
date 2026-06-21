"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";
import { prisma } from "@/lib/db";
import {
  createStrategyMarkdownFile,
  deleteStrategyMarkdownAssets,
  readStrategyMarkdownFile,
  saveStrategyGraphImage,
  writeStrategyMarkdownFile,
} from "@/lib/strategy-markdown-fs";
import type { StrategyMarkdownContent } from "@/lib/strategy-markdown";
import { TOOLS_STRATEGIES_PATH } from "@/lib/tools-paths";

const GRAPH_MAX_BYTES = 8 * 1024 * 1024;
const GRAPH_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

function revalidateStrategies() {
  revalidatePath(TOOLS_STRATEGIES_PATH);
  revalidatePath("/tools/strategies");
}

async function loadMd(strategyId: number, markdownPath: string | null) {
  return (
    (await readStrategyMarkdownFile(strategyId, markdownPath)) ?? {
      graph: "",
      requirements: [],
      bestFor: "",
      commonMistake: "",
    }
  );
}

async function persistMd(
  strategyId: number,
  markdownPath: string | null,
  name: string,
  content: StrategyMarkdownContent
): Promise<string> {
  return writeStrategyMarkdownFile(strategyId, markdownPath, name, content);
}

export async function listStrategies() {
  return listStrategiesForCrud();
}

export async function listStrategiesForCrud() {
  const rows = await prisma.strategy.findMany({
    orderBy: { name: "asc" },
  });

  return Promise.all(
    rows.map(async (strategy) => {
      const markdown = await loadMd(strategy.id, strategy.markdownPath);
      return {
        id: strategy.id,
        name: strategy.name,
        graphPath: markdown.graph.trim() ? "yes" : null,
        bestFor: strategy.bestFor ?? (markdown.bestFor.trim() || null),
        commonMistake: markdown.commonMistake.trim() || null,
        updatedAt: strategy.updatedAt,
        _count: { requirements: markdown.requirements.length },
      };
    })
  );
}

export async function getStrategy(id: number) {
  return prisma.strategy.findUnique({ where: { id } });
}

export async function getStrategyWithMarkdown(id: number) {
  const strategy = await getStrategy(id);
  if (!strategy) return null;
  const markdown = await loadMd(strategy.id, strategy.markdownPath);
  return { strategy, markdown };
}

export async function createStrategy(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const tendency = String(formData.get("tendency") ?? "").trim() || null;
  const bestFor = String(formData.get("bestFor") ?? "").trim() || null;

  const strategy = await prisma.strategy.create({
    data: { name, tendency, bestFor },
  });

  const mdPath = await createStrategyMarkdownFile(strategy.id, name);
  const content = await loadMd(strategy.id, mdPath);
  if (bestFor) content.bestFor = bestFor;
  const finalPath = await persistMd(strategy.id, mdPath, name, content);

  await prisma.strategy.update({
    where: { id: strategy.id },
    data: { markdownPath: finalPath },
  });

  revalidateStrategies();
  redirect(`${TOOLS_STRATEGIES_PATH}?id=${strategy.id}`);
}

export async function updateStrategyName(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const strategy = await prisma.strategy.findUnique({ where: { id } });
  if (!strategy) return;

  const content = await loadMd(id, strategy.markdownPath);
  await persistMd(id, strategy.markdownPath, name, content);

  await prisma.strategy.update({ where: { id }, data: { name } });
  revalidateStrategies();
  redirect(`${TOOLS_STRATEGIES_PATH}?id=${id}`);
}

export async function updateStrategyMeta(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const bestFor = String(formData.get("bestFor") ?? "").trim() || null;
  const tendency = String(formData.get("tendency") ?? "").trim() || null;

  const strategy = await prisma.strategy.findUnique({ where: { id } });
  if (!strategy) return;

  const content = await loadMd(id, strategy.markdownPath);
  content.bestFor = bestFor ?? "";
  await persistMd(id, strategy.markdownPath, strategy.name, content);

  await prisma.strategy.update({
    where: { id },
    data: { bestFor, tendency },
  });

  revalidateStrategies();
}

export async function addStrategyRequirement(formData: FormData): Promise<void> {
  const strategyId = Number(formData.get("strategyId"));
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) return;

  const content = await loadMd(strategyId, strategy.markdownPath);
  content.requirements.push(text);
  await persistMd(strategyId, strategy.markdownPath, strategy.name, content);
  revalidateStrategies();
}

export async function deleteStrategyRequirement(formData: FormData): Promise<void> {
  const strategyId = Number(formData.get("strategyId"));
  const index = Number(formData.get("index"));
  if (!Number.isFinite(index) || index < 0) return;

  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) return;

  const content = await loadMd(strategyId, strategy.markdownPath);
  if (index >= content.requirements.length) return;
  content.requirements.splice(index, 1);
  await persistMd(strategyId, strategy.markdownPath, strategy.name, content);
  revalidateStrategies();
}

export async function updateStrategyBestFor(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const bestFor = String(formData.get("bestFor") ?? "").trim();

  const strategy = await prisma.strategy.findUnique({ where: { id } });
  if (!strategy) return;

  const content = await loadMd(id, strategy.markdownPath);
  content.bestFor = bestFor;
  await persistMd(id, strategy.markdownPath, strategy.name, content);

  await prisma.strategy.update({
    where: { id },
    data: { bestFor: bestFor || null },
  });

  revalidateStrategies();
}

export async function updateStrategyRequirements(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const raw = String(formData.get("requirements") ?? "");
  const requirements = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const strategy = await prisma.strategy.findUnique({ where: { id } });
  if (!strategy) return;

  const content = await loadMd(id, strategy.markdownPath);
  content.requirements = requirements;
  await persistMd(id, strategy.markdownPath, strategy.name, content);
  revalidateStrategies();
}

export async function updateStrategyCommonMistake(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const commonMistake = String(formData.get("commonMistake") ?? "").trim();

  const strategy = await prisma.strategy.findUnique({ where: { id } });
  if (!strategy) return;

  const content = await loadMd(id, strategy.markdownPath);
  content.commonMistake = commonMistake;
  await persistMd(id, strategy.markdownPath, strategy.name, content);
  revalidateStrategies();
}

export async function uploadStrategyGraph(formData: FormData): Promise<void> {
  const strategyId = Number(formData.get("strategyId"));
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) return;
  if (!(GRAPH_TYPES as readonly string[]).includes(file.type)) return;
  if (file.size > GRAPH_MAX_BYTES) return;

  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) return;

  const ext = path.extname(file.name) || ".png";
  const bytes = Buffer.from(await file.arrayBuffer());
  const rel = await saveStrategyGraphImage(strategyId, bytes, ext);

  const content = await loadMd(strategyId, strategy.markdownPath);
  content.graph = `![Gráfico](${rel})`;
  await persistMd(strategyId, strategy.markdownPath, strategy.name, content);

  revalidateStrategies();
}

export async function deleteStrategyGraph(formData: FormData): Promise<void> {
  const strategyId = Number(formData.get("strategyId"));
  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) return;

  const content = await loadMd(strategyId, strategy.markdownPath);
  content.graph = "";
  await persistMd(strategyId, strategy.markdownPath, strategy.name, content);
  revalidateStrategies();
}

export async function deleteStrategy(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const strategy = await prisma.strategy.findUnique({ where: { id } });
  if (!strategy) return;

  await deleteStrategyMarkdownAssets(id, strategy.markdownPath);
  await prisma.strategy.delete({ where: { id } });

  revalidateStrategies();
  redirect(TOOLS_STRATEGIES_PATH);
}
