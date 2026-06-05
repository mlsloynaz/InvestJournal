import { AnalysisType } from "@prisma/client";

type Entry = {
  id: number;
  entryAt: Date;
  type: AnalysisType;
  body: string;
};

type DayGroup = {
  date: string;
  items: Entry[];
};

const typeLabels: Record<AnalysisType, string> = {
  NOTE: "Nota",
  PREDICTION: "Predicción",
  MISTAKE: "Error",
};

const typeStyles: Record<AnalysisType, string> = {
  NOTE: "bg-blue-100 text-blue-900",
  PREDICTION: "bg-amber-100 text-amber-900",
  MISTAKE: "bg-red-100 text-red-900",
};

export function AnalysisTimeline({ groups }: { groups: DayGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="text-gray-600 text-sm py-8 text-center">
        No hay entradas de análisis todavía.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.date}>
          <h3 className="font-semibold text-investep-navy border-b border-investep-navy/20 pb-1 mb-3">
            {group.date}
          </h3>
          <ul className="space-y-3">
            {group.items.map((entry) => (
              <li
                key={entry.id}
                className="bg-white rounded border border-investep-navy/15 p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-1 text-xs">
                  <time className="text-gray-500">
                    {entry.entryAt.toLocaleTimeString("es", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <span
                    className={`px-2 py-0.5 rounded font-medium ${typeStyles[entry.type]}`}
                  >
                    {typeLabels[entry.type]}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{entry.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
