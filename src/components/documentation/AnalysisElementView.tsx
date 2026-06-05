import type { AnalysisElement, AnalysisSection } from "@/data/analysis-elements";
import { AnalysisSectionBlock } from "@/components/documentation/AnalysisSectionBlock";

export function AnalysisElementView({ element }: { element: AnalysisElement }) {
  return (
    <div className="space-y-6">
      <header className="bg-white border-2 border-investep-navy/15 rounded-lg p-5">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <h1 className="text-2xl font-bold text-investep-navy">{element.title}</h1>
            <p className="text-sm text-gray-600 mt-1">{element.tagline}</p>
          </div>
          {element.weight && (
            <span className="bg-investep-gold text-investep-navy text-lg font-bold px-3 py-1 rounded">
              {element.weight}
            </span>
          )}
        </div>
        {element.timeframes && (
          <p className="text-xs text-gray-500 mt-3">
            Temporalidades: <strong className="text-investep-navy">{element.timeframes}</strong>
          </p>
        )}
      </header>

      <div className="space-y-6 bg-investep-cream/30 border border-investep-navy/10 rounded-lg p-5">
        {element.sections.map((section: AnalysisSection, index: number) => (
          <AnalysisSectionBlock key={`${section.type}-${index}`} section={section} />
        ))}
      </div>
    </div>
  );
}
