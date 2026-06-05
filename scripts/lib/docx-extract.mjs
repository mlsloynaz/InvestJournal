import fs from "fs/promises";
import path from "path";

const DOCX_NS = {
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
};

/** @typedef {{ text: string, style: string | null, imageRIds: string[] }} DocxBlock */

/**
 * @param {string} docxExtractDir - folder with word/document.xml and word/_rels/document.xml.rels
 */
export async function loadDocxExtract(docxExtractDir) {
  const docXml = await fs.readFile(path.join(docxExtractDir, "word", "document.xml"), "utf8");
  const relsXml = await fs.readFile(
    path.join(docxExtractDir, "word", "_rels", "document.xml.rels"),
    "utf8"
  );
  const rIdToMedia = parseRels(relsXml);
  const blocks = parseDocumentBlocks(docXml);
  return { blocks, rIdToMedia, mediaDir: path.join(docxExtractDir, "word", "media") };
}

/**
 * @param {string} relsXml
 * @returns {Map<string, string>}
 */
function parseRels(relsXml) {
  const map = new Map();
  const re = /Id="(rId\d+)"[^>]*Target="([^"]+)"/g;
  let m;
  while ((m = re.exec(relsXml)) !== null) {
    const target = m[2].replace(/^\.\.\//, "");
    if (target.startsWith("media/")) {
      map.set(m[1], target);
    }
  }
  return map;
}

/**
 * @param {string} docXml
 * @returns {DocxBlock[]}
 */
function parseDocumentBlocks(docXml) {
  const paraRe = /<w:p\b[\s\S]*?<\/w:p>/g;
  /** @type {DocxBlock[]} */
  const blocks = [];
  let match;
  while ((match = paraRe.exec(docXml)) !== null) {
    const chunk = match[0];
    const styleMatch = chunk.match(/<w:pStyle w:val="([^"]+)"/);
    const texts = [];
    const textRe = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tm;
    while ((tm = textRe.exec(chunk)) !== null) {
      texts.push(tm[1]);
    }
    const text = texts.join("").trim();
    const imageRIds = [];
    const embedRe = /r:embed="(rId\d+)"/g;
    let em;
    while ((em = embedRe.exec(chunk)) !== null) {
      imageRIds.push(em[1]);
    }
    if (text || imageRIds.length) {
      blocks.push({
        text,
        style: styleMatch ? styleMatch[1] : null,
        imageRIds,
      });
    }
  }
  return blocks;
}

/** Strategy title lines in the notes doc (after the Estrategias section). */
const STRATEGY_TITLE_PATTERNS = [
  /^Current en tendencia bajista$/i,
  /^Estrategia del millon se presenta desde una lateralidad$/i,
];

const SECTION_STOP = /^(Planes|Plan \d|REQUISITOS|Basico|Confirmacion|Lineas TENDENCIA|Precio de apertura|Fases del mercado|Info General)/i;

/**
 * @param {DocxBlock[]} blocks
 */
export function findStrategySections(blocks) {
  let inStrategies = false;
  /** @type {{ name: string, blocks: DocxBlock[] }[]} */
  const sections = [];
  /** @type {{ name: string, blocks: DocxBlock[] } | null} */
  let current = null;

  for (const block of blocks) {
    const t = block.text.trim();
    if (/^Estrategias/i.test(t)) {
      inStrategies = true;
      continue;
    }
    if (!inStrategies) continue;

    const isStrategyTitle =
      block.style === "Heading2" ||
      STRATEGY_TITLE_PATTERNS.some((re) => re.test(t)) ||
      (t.length > 8 && t.length < 120 && /^[A-ZÁÉÍÓÚÑ]/.test(t) && !SECTION_STOP.test(t) && current === null && sections.length === 0);

    if (isStrategyTitle && STRATEGY_TITLE_PATTERNS.some((re) => re.test(t))) {
      if (current) sections.push(current);
      current = { name: t, blocks: [] };
      continue;
    }

    if (current && SECTION_STOP.test(t)) {
      sections.push(current);
      current = null;
      continue;
    }

    if (current) current.blocks.push(block);
  }

  if (current) sections.push(current);
  return sections;
}

/**
 * Shared REQUISITOS + Confirmación bullets (appear later in the doc).
 * @param {DocxBlock[]} blocks
 */
export function extractSharedRequirements(blocks) {
  /** @type {string[]} */
  const items = [];
  let inRequisitos = false;
  let inConfirmacion = false;

  for (const block of blocks) {
    const t = block.text.trim();
    if (/^REQUISITOS$/i.test(t)) {
      inRequisitos = true;
      inConfirmacion = false;
      continue;
    }
    if (/^Confirmacion\s*:/i.test(t)) {
      inRequisitos = false;
      inConfirmacion = true;
      continue;
    }
    if (/^Basico\s*\.?$/i.test(t) && inConfirmacion) {
      items.push(t);
      continue;
    }
    if (/^Lineas TENDENCIA/i.test(t)) {
      inRequisitos = false;
      inConfirmacion = false;
      break;
    }

    if (inRequisitos && t && !/^SE CUMPLE/i.test(t) && !/^(apl|amzn)$/i.test(t)) {
      if (t.length >= 4 && t.length <= 200) items.push(t);
    }

    if (inConfirmacion && t) {
      if (/^Confirmacion\s*:/i.test(t)) continue;
      const parts = splitConfirmacionLine(t);
      for (const p of parts) {
        if (p.length >= 4) items.push(p);
      }
    }
  }

  return items;
}

/**
 * @param {string} line
 * @returns {string[]}
 */
function splitConfirmacionLine(line) {
  if (!line.includes(":")) return [line];
  const chunks = line.split(/(?<=[a-záéíóúñ])\s+(?=[a-záéíóúñ])/i);
  /** @type {string[]} */
  const out = [];
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    if (trimmed.includes(":")) {
      const idx = trimmed.indexOf(":");
      const label = trimmed.slice(0, idx).trim();
      const rest = trimmed.slice(idx + 1).trim();
      if (label && rest) out.push(`${label}: ${rest}`);
      else if (label) out.push(label);
    } else {
      out.push(trimmed);
    }
  }
  return out.length ? out : [line];
}

/**
 * @param {{ blocks: DocxBlock[] }} section
 * @param {Map<string, string>} rIdToMedia
 */
export function sectionTextAndImages(section, rIdToMedia) {
  /** @type {string[]} */
  const descriptions = [];
  /** @type {string[]} */
  const mediaPaths = [];

  for (const block of section.blocks) {
    if (block.text && !/^—+$/.test(block.text)) {
      descriptions.push(block.text.trim());
    }
    for (const rid of block.imageRIds) {
      const media = rIdToMedia.get(rid);
      if (media) mediaPaths.push(media);
    }
  }

  return { descriptions, mediaPaths };
}
