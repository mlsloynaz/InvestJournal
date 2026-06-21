/** Detect explicit Mermaid source or convert simple arrow-flow ASCII blocks. */

export function looksLikeMermaid(text: string): boolean {
  const first = text.trim().split("\n").find((line) => line.trim())?.trim() ?? "";
  return /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie)\b/i.test(
    first
  );
}

const ARROW_FLOW = /\u2193|\u2192/; // down arrow, right arrow
const BULLET_START = /^[\u00b7\u2022]\s/;

export function asciiFlowToMermaid(text: string): string | null {
  const raw = text.replace(/\r\n/g, "\n");
  if (!ARROW_FLOW.test(raw)) return null;

  const steps: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === "\u2193") continue;
    if (/^\u2193\s*(NO|SI|S\u00cd)?$/i.test(trimmed)) continue;
    if (BULLET_START.test(trimmed)) continue;
    if (/^\s+\u2193/.test(line)) continue;
    steps.push(trimmed.replace(/\s+/g, " "));
  }

  if (steps.length < 2) return null;

  let out = "flowchart TD\n";
  steps.forEach((step, index) => {
    const id = `s${index}`;
    const safe = step.replace(/"/g, "'").slice(0, 140);
    out += `  ${id}["${safe}"]\n`;
    if (index > 0) out += `  s${index - 1} --> ${id}\n`;
  });
  return out;
}

export function resolveMermaidChart(text: string, language?: string): string | null {
  const body = text.trim();
  if (!body) return null;
  if (language === "mermaid") return body;
  if (looksLikeMermaid(body)) return body;
  return asciiFlowToMermaid(body);
}
