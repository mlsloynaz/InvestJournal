import { readFile } from "fs/promises";
import path from "path";
import { strategyImagesDir } from "@/lib/strategy-markdown";

const EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const strategyId = Number(id);
  if (!Number.isFinite(strategyId)) {
    return new Response("Not found", { status: 404 });
  }

  const dir = strategyImagesDir(strategyId);
  for (const ext of EXTENSIONS) {
    try {
      const filePath = path.join(dir, `graph${ext}`);
      const bytes = await readFile(filePath);
      const contentType =
        ext === ".png"
          ? "image/png"
          : ext === ".gif"
            ? "image/gif"
            : ext === ".webp"
              ? "image/webp"
              : "image/jpeg";
      return new Response(bytes, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      /* try next extension */
    }
  }

  return new Response("Not found", { status: 404 });
}
