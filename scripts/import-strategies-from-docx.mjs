/**
 * Import strategies from notas-i.docx into InvestJournal.
 *
 * Usage:
 *   node scripts/import-strategies-from-docx.mjs --docx "C:\dta\mio\notas-i.docx"
 *   node scripts/import-strategies-from-docx.mjs --docx "..." --only 1
 *   node scripts/import-strategies-from-docx.mjs --extract-dir "C:\Code\InvestJournal\temp-notas-i" --only 1
 */
import { PrismaClient } from "@prisma/client";
import { mkdir, copyFile, rm, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  loadDocxExtract,
  findStrategySections,
  extractSharedRequirements,
  sectionTextAndImages,
} from "./lib/docx-extract.mjs";
import { convertImageToLightMode } from "./lib/image-light-mode.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const UPLOADS_SEGMENT = "uploads/strategies";

function parseArgs(argv) {
  const args = { only: null, docx: null, extractDir: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--only" && argv[i + 1]) args.only = Number(argv[++i]);
    else if (a === "--docx" && argv[i + 1]) args.docx = argv[++i];
    else if (a === "--extract-dir" && argv[i + 1]) args.extractDir = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
  }
  return args;
}

async function ensureDocxExtracted(docxPath) {
  const extractDir = path.join(projectRoot, "temp-notas-i");
  const zipPath = path.join(projectRoot, "temp-notas-i.zip");
  await copyFile(docxPath, zipPath);
  await rm(extractDir, { recursive: true, force: true });
  await mkdir(extractDir, { recursive: true });
  const { execSync } = await import("child_process");
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`,
    { stdio: "inherit", cwd: projectRoot }
  );
  return extractDir;
}

function graphFileName(strategyId) {
  return `graph-import-${Date.now()}.png`;
}

async function saveLightGraph(sharp, strategyId, sourceAbsPath) {
  const publicDir = path.join(projectRoot, "public", UPLOADS_SEGMENT, String(strategyId));
  await mkdir(publicDir, { recursive: true });
  const fileName = graphFileName(strategyId);
  const absOut = path.join(publicDir, fileName);
  await convertImageToLightMode(sharp, sourceAbsPath, absOut);
  const graphPath = `/${UPLOADS_SEGMENT}/${strategyId}/${fileName}`;
  return { graphPath, graphFileName: path.basename(sourceAbsPath) };
}

async function main() {
  const args = parseArgs(process.argv);
  const docx =
    args.docx || process.env.STRATEGY_DOCX || "C:\\dta\\mio\\notas-i.docx";
  let extractDir = args.extractDir;

  if (!extractDir) {
    console.log("Extracting docx from", docx);
    extractDir = await ensureDocxExtracted(docx);
  }

  const { blocks, rIdToMedia, mediaDir } = await loadDocxExtract(extractDir);
  const sections = findStrategySections(blocks);
  const sharedRequirements = extractSharedRequirements(blocks);

  console.log("Strategies found in document:", sections.map((s) => s.name).join(" | "));
  console.log("Shared REQUISITOS items:", sharedRequirements.length);

  if (sections.length === 0) {
    console.error("No strategy sections parsed.");
    process.exit(1);
  }

  const toImport =
    args.only != null ? sections.slice(0, args.only) : sections;

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("Install sharp: npm install sharp --save-dev");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    for (const section of toImport) {
      const { descriptions, mediaPaths } = sectionTextAndImages(section, rIdToMedia);
      const bestFor = descriptions.join("\n\n").trim() || null;

      const requirements = [...sharedRequirements];

      console.log("\n---", section.name, "---");
      console.log("bestFor:", bestFor || "(none)");
      console.log("requirements:", requirements.length);
      console.log("images in section:", mediaPaths.length, mediaPaths[0] || "(none)");

      if (args.dryRun) continue;

      const existing = await prisma.strategy.findUnique({
        where: { name: section.name },
        include: { requirements: true },
      });

      let strategy;
      if (existing) {
        strategy = await prisma.strategy.update({
          where: { id: existing.id },
          data: { bestFor },
        });
        await prisma.strategyRequirement.deleteMany({ where: { strategyId: strategy.id } });
        console.log("Updated existing strategy id", strategy.id);
      } else {
        strategy = await prisma.strategy.create({
          data: { name: section.name, bestFor },
        });
        console.log("Created strategy id", strategy.id);
      }

      if (requirements.length) {
        await prisma.strategyRequirement.createMany({
          data: requirements.map((text, sortOrder) => ({
            strategyId: strategy.id,
            text: text.slice(0, 512),
            sortOrder,
          })),
        });
      }

      const firstMedia = mediaPaths[0];
      if (firstMedia) {
        const sourceAbs = path.join(mediaDir, path.basename(firstMedia));
        const saved = await saveLightGraph(sharp, strategy.id, sourceAbs);
        await prisma.strategy.update({
          where: { id: strategy.id },
          data: {
            graphPath: saved.graphPath,
            graphFileName: saved.graphFileName,
          },
        });
        console.log("Graph saved:", saved.graphPath);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
