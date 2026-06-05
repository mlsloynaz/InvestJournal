import type { AnalysisSection } from "@/data/analysis-elements";
import { AnalysisDiagram } from "@/components/documentation/AnalysisDiagrams";

export function AnalysisSectionBlock({ section }: { section: AnalysisSection }) {
  switch (section.type) {
    case "intro":
      return <p className="text-base text-gray-700 leading-relaxed">{section.text}</p>;

    case "callout":
      return (
        <aside
          className={
            section.variant === "gold"
              ? "bg-investep-gold/20 border border-investep-gold/50 rounded-lg px-4 py-3"
              : "bg-investep-navy/5 border border-investep-navy/20 rounded-lg px-4 py-3"
          }
        >
          <h3 className="text-sm font-semibold text-investep-navy mb-1">{section.title}</h3>
          <p className="text-sm text-gray-800">{section.text}</p>
        </aside>
      );

    case "bullets":
      return (
        <section>
          <h3 className="text-sm font-semibold text-investep-navy uppercase tracking-wide mb-2">
            {section.title}
          </h3>
          <ul className="space-y-2">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-gray-800">
                <span className="text-investep-gold font-bold shrink-0">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      );

    case "steps":
      return (
        <section>
          {section.title ? (
            <h3 className="text-sm font-semibold text-investep-navy uppercase tracking-wide mb-3">
              {section.title}
            </h3>
          ) : null}
          <ol className="space-y-2">
            {section.items.map((item, index) => (
              <li
                key={item}
                className="flex gap-3 text-sm text-gray-800 bg-white border border-investep-navy/10 rounded-md px-3 py-2"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-investep-navy text-white text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
        </section>
      );

    case "table":
      return (
        <section>
          <h3 className="text-sm font-semibold text-investep-navy uppercase tracking-wide mb-2">
            {section.title}
          </h3>
          <div className="overflow-x-auto">
            <table className="data-table text-sm">
              <thead>
                <tr>
                  {section.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.join("|")}>
                    {row.map((cell) => (
                      <td key={cell}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );

    case "diagram":
      return (
        <section>
          <h3 className="text-sm font-semibold text-investep-navy uppercase tracking-wide mb-3">
            {section.title}
          </h3>
          <AnalysisDiagram id={section.diagram} />
        </section>
      );

    case "cards":
      return (
        <section>
          <h3 className="text-sm font-semibold text-investep-navy uppercase tracking-wide mb-3">
            {section.title}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.cards.map((card) => (
              <article
                key={card.title}
                className="bg-white border-2 border-investep-navy/15 rounded-lg p-4 space-y-2"
              >
                <h4 className="font-bold text-investep-navy">{card.title}</h4>
                {card.subtitle && (
                  <p className="text-xs text-investep-gold font-semibold uppercase tracking-wide">
                    {card.subtitle}
                  </p>
                )}
                <p className="text-sm text-gray-700">{card.body}</p>
                {card.items && card.items.length > 0 && (
                  <ul className="text-xs text-gray-600 space-y-1 pt-1 border-t border-investep-navy/10">
                    {card.items.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      );

    default:
      return null;
  }
}
