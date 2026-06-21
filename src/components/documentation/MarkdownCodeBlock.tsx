"use client";

import { MermaidDiagram } from "@/components/documentation/MermaidDiagram";
import { resolveMermaidChart } from "@/lib/markdown-mermaid";

export function MarkdownCodeBlock({
  text,
  language,
}: {
  text: string;
  language?: string;
}) {
  const mermaidChart = resolveMermaidChart(text, language);

  if (mermaidChart) {
    return <MermaidDiagram chart={mermaidChart} />;
  }

  return (
    <pre className="bg-investep-navy text-investep-cream text-xs p-4 rounded overflow-x-auto whitespace-pre-wrap font-mono">
      {text}
    </pre>
  );
}
