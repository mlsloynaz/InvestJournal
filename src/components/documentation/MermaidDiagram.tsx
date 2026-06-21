"use client";

import { useEffect, useId, useState } from "react";

type Props = {
  chart: string;
};

export function MermaidDiagram({ chart }: Props) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "strict",
          flowchart: {
            htmlLabels: true,
            curve: "basis",
          },
        });

        const id = `mermaid-${reactId}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo renderizar el diagrama");
          setSvg("");
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          Diagrama Mermaid: {error}
        </p>
        <pre className="bg-investep-navy text-investep-cream text-xs p-4 rounded overflow-x-auto whitespace-pre-wrap font-mono">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-lg border border-investep-navy/15 bg-investep-cream/40 px-4 py-8 text-center text-sm text-gray-500">
        Cargando diagrama...
      </div>
    );
  }

  return (
    <div
      className="my-4 overflow-x-auto rounded-lg border border-investep-navy/15 bg-white p-4 [&_svg]:max-w-none [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
