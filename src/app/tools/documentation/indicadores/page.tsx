import { DocsBackLink } from "@/components/documentation/DocsBackLink";
import { AnalysisElementsHub } from "@/components/documentation/AnalysisElementsHub";

export default function ToolsElementosAnalisisPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <DocsBackLink />
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">Elementos de análisis</h1>
        <p className="text-sm text-gray-600 mt-1">
          Temporalidades y cada herramienta del análisis técnico — fácil de leer y aprender.
        </p>
      </header>
      <AnalysisElementsHub />
    </div>
  );
}
