import Link from "next/link";
import {
  analysisElementPath,
  listAnalysisElements,
  type AnalysisElement,
} from "@/data/analysis-elements";

function ElementBar({ item, badge }: { item: AnalysisElement; badge?: string }) {
  const isOverview =
    item.slug === "temporalidades" ||
    item.slug === "checklist-pre-market" ||
    item.slug === "misc";
  return (
    <li>
      <Link
        href={analysisElementPath(item.slug)}
        className={`group flex items-center gap-3 rounded-lg overflow-hidden border-2 transition-all hover:shadow-md ${
          isOverview
            ? "border-investep-gold bg-investep-navy hover:border-investep-gold"
            : "border-investep-navy/30 bg-investep-navy hover:border-investep-gold"
        }`}
      >
        <span
          className="shrink-0 pl-4 text-investep-gold text-lg"
          aria-hidden
        >
          📌
        </span>
        <span className="flex-1 py-3.5 pr-2 text-white font-bold uppercase tracking-wide text-sm sm:text-base group-hover:text-investep-gold transition-colors">
          {item.title}
        </span>
        {item.weight ? (
          <span className="shrink-0 pr-4 text-investep-gold font-bold text-sm sm:text-base">
            {item.weight}
          </span>
        ) : (
          <span className="shrink-0 pr-4 text-xs text-investep-gold/90 uppercase tracking-wide hidden sm:inline">
            {badge ?? "Resumen"}
          </span>
        )}
      </Link>
      <p className="text-xs text-gray-600 mt-1.5 px-1">{item.tagline}</p>
    </li>
  );
}

export function AnalysisElementsHub() {
  const elements = listAnalysisElements();
  const temporalidades = elements.find((e) => e.slug === "temporalidades")!;
  const checklistPremarket = elements.find((e) => e.slug === "checklist-pre-market")!;
  const misc = elements.find((e) => e.slug === "misc")!;
  const indicators = elements.filter((e) => e.weight != null);
  return (
    <div className="space-y-8">
      <section className="bg-investep-gold/15 border border-investep-gold/40 rounded-lg p-4 text-sm text-gray-800">
        <p>
          El análisis técnico pesa <strong>~97%</strong> en la decisión. Cada elemento tiene un
          porcentaje. <strong>Temporalidades</strong> explica qué hacer en día, hora y 15 min;
          cada <strong>elemento</strong> explica esa herramienta en detalle.
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-investep-navy uppercase tracking-wide mb-3">
          Temporalidades
        </h2>
        <ul>
          <ElementBar item={temporalidades} />
        </ul>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-investep-navy uppercase tracking-wide mb-3">
          Checklist Pre-Market
        </h2>
        <ul>
          <ElementBar item={checklistPremarket} badge="Rutina" />
        </ul>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-investep-navy uppercase tracking-wide mb-3">
          Elementos del análisis
        </h2>
        <ul className="space-y-4">
          {indicators.map((item) => (
            <ElementBar key={item.slug} item={item} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-investep-navy uppercase tracking-wide mb-3">
          Misc — herramientas generales
        </h2>
        <ul>
          <ElementBar item={misc} badge="General" />
        </ul>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
        {indicators.map((item) => (
          <div
            key={item.slug}
            className="bg-white border rounded px-2 py-2"
          >
            <p className="font-bold text-investep-navy">{item.weight}</p>
            <p className="text-gray-600 mt-0.5 leading-tight">{item.title}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
