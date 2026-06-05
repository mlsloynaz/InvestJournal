import { mkdir, writeFile, unlink, rm } from "fs/promises";
import path from "path";

/** Relative to /public — served at http://localhost:3000/uploads/strategies/... */
export const STRATEGY_UPLOADS_SEGMENT = "uploads/strategies";

export const STRATEGY_GRAPH_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const STRATEGY_GRAPH_MAX_BYTES = 8 * 1024 * 1024;

/** Public URL path, e.g. /uploads/strategies/3/graph-123.png */
export function strategyGraphPublicDir(strategyId: number): string {
  return `/${STRATEGY_UPLOADS_SEGMENT}/${strategyId}`;
}

/** Absolute disk path: {project}/public/uploads/strategies/{id} */
export function strategyGraphAbsoluteDir(strategyId: number): string {
  return path.join(process.cwd(), "public", STRATEGY_UPLOADS_SEGMENT, String(strategyId));
}

export function publicUrlToAbsoluteFile(publicUrlPath: string): string {
  const relative = publicUrlPath.replace(/^\//, "").replace(/\//g, path.sep);
  return path.join(process.cwd(), "public", relative);
}

function safeFileName(original: string): string {
  const ext = path.extname(original).replace(/[^a-zA-Z0-9.]/g, "");
  const base = path.basename(original, path.extname(original)).replace(/[^a-zA-Z0-9.-]/g, "_");
  return `graph-${Date.now()}-${base || "image"}${ext || ".png"}`;
}

export type SavedStrategyGraph = {
  /** Path stored in DB — use as <img src={graphPath} /> */
  graphPath: string;
  graphFileName: string;
};

/**
 * Writes image bytes to public/uploads/strategies/{strategyId}/.
 * Does not update the database — caller persists graphPath / graphFileName.
 */
export async function saveStrategyGraphToPublic(
  strategyId: number,
  file: File
): Promise<SavedStrategyGraph> {
  const absDir = strategyGraphAbsoluteDir(strategyId);
  await mkdir(absDir, { recursive: true });

  const fileName = safeFileName(file.name);
  const graphPath = `${strategyGraphPublicDir(strategyId)}/${fileName}`;
  const absFile = path.join(absDir, fileName);

  const bytes = await file.arrayBuffer();
  await writeFile(absFile, Buffer.from(bytes));

  return { graphPath, graphFileName: file.name };
}

/** Removes one file under public/ if it exists. */
export async function deleteStrategyGraphFile(publicUrlPath: string | null | undefined): Promise<void> {
  if (!publicUrlPath) return;
  try {
    await unlink(publicUrlToAbsoluteFile(publicUrlPath));
  } catch {
    /* missing file is ok */
  }
}

/** Removes entire strategy upload folder (all graph versions). */
export async function deleteStrategyGraphFolder(strategyId: number): Promise<void> {
  try {
    await rm(strategyGraphAbsoluteDir(strategyId), { recursive: true, force: true });
  } catch {
    /* missing folder is ok */
  }
}
