import { mkdir, readFile, unlink, writeFile, rm } from "fs/promises";
import path from "path";
import {
  defaultStrategyMarkdown,
  getStrategiesBaseDir,
  parseStrategyMarkdown,
  serializeStrategyMarkdown,
  strategyImagesDir,
  strategyMarkdownFilePath,
  type StrategyMarkdownContent,
} from "@/lib/strategy-markdown";

export async function ensureStrategiesBaseDir(): Promise<string> {
  const base = getStrategiesBaseDir();
  await mkdir(base, { recursive: true });
  return base;
}

export async function readStrategyMarkdownFile(
  strategyId: number,
  markdownPath: string | null
): Promise<StrategyMarkdownContent | null> {
  const filePath = strategyMarkdownFilePath(strategyId, markdownPath);
  try {
    const raw = await readFile(filePath, "utf8");
    return parseStrategyMarkdown(raw);
  } catch {
    return null;
  }
}

export async function writeStrategyMarkdownFile(
  strategyId: number,
  markdownPath: string | null,
  name: string,
  content: StrategyMarkdownContent
): Promise<string> {
  await ensureStrategiesBaseDir();
  const filePath = strategyMarkdownFilePath(strategyId, markdownPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, serializeStrategyMarkdown(content, name), "utf8");
  return filePath;
}

export async function createStrategyMarkdownFile(
  strategyId: number,
  name: string
): Promise<string> {
  await ensureStrategiesBaseDir();
  const filePath = strategyMarkdownFilePath(strategyId, null);
  await writeFile(filePath, defaultStrategyMarkdown(name), "utf8");
  return filePath;
}

export async function deleteStrategyMarkdownAssets(
  strategyId: number,
  markdownPath: string | null
): Promise<void> {
  const filePath = strategyMarkdownFilePath(strategyId, markdownPath);
  try {
    await unlink(filePath);
  } catch {
    /* missing */
  }
  try {
    await rm(strategyImagesDir(strategyId), { recursive: true, force: true });
  } catch {
    /* missing */
  }
}

export async function saveStrategyGraphImage(
  strategyId: number,
  bytes: Buffer,
  ext: string
): Promise<string> {
  const dir = strategyImagesDir(strategyId);
  await mkdir(dir, { recursive: true });
  const fileName = `graph${ext}`;
  const absPath = path.join(dir, fileName);
  await writeFile(absPath, bytes);
  return `./images/${fileName}`;
}
