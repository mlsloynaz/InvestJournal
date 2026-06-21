/** Shared markdown field extraction for estrategia-*.md exports. */

export function extractTimeframesLine(markdown: string): string {
  const peso = /\*\*Peso TF:\*\*\s*(.+)/i.exec(markdown);
  if (peso?.[1]?.trim()) return peso[1].trim();

  const table = /## Gráficos[\s\S]*?\|[^\n]*TF[^\n]*\|[\s\S]*?\n\|[-| ]+\|\n([\s\S]*?)(?=\n\n|\n## )/.exec(
    markdown
  );
  if (table?.[1]) {
    const rows = table[1]
      .trim()
      .split("\n")
      .map((row) => row.replace(/^\|\s*|\s*\|$/g, "").split("|").map((c) => c.trim()))
      .filter((cells) => cells.some((c) => /d[ií]a|hora|15\s*min/i.test(c)))
      .map((cells) => cells.filter(Boolean).join(" · "))
      .filter(Boolean);
    if (rows.length > 0) return rows.join("; ");
  }

  return "D (contexto), 1h (confirmación), 15m (entrada)";
}

export function extractEntryLine(markdown: string): string {
  const resumen = /## Resumen\s+([\s\S]*?)(?=\n## |\n---|\Z)/.exec(markdown);
  if (resumen?.[1]) {
    const firstPara = resumen[1]
      .trim()
      .split(/\n\n+/)[0]
      ?.replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (firstPara) {
      return firstPara.length > 320 ? `${firstPara.slice(0, 317)}…` : firstPara;
    }
  }
  return "Ver requisitos numerados en el playbook.";
}

export function extractExitLine(markdown: string): string {
  if (/GESTIÓN|Objetivo y gestión|Ma\s*40|MA\s*40|H-Line|disipador/i.test(markdown)) {
    return "MA40, H-Line, disipadores y ventana 1–3 días — ver Panorama y GESTIÓN en el playbook.";
  }
  return "Ver secciones Objetivo y gestión en el playbook.";
}
