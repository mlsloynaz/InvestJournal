import Link from "next/link";
import { format } from "date-fns";
import { AddAnalysisForm } from "@/components/analysis/AddAnalysisForm";
import { AnalysisTimeline } from "@/components/analysis/AnalysisTimeline";
import { getAnalysisTimeline } from "@/server/actions/analysis";
import { listNoteTypeConfigs } from "@/server/services/note-types";

type Props = {
  tickerId: number;
  symbol: string;
  tickerWeekId?: number;
  showHistory?: boolean;
  historyDays?: number;
};

export async function AnalysisSection({
  tickerId,
  symbol,
  tickerWeekId,
  showHistory = true,
  historyDays = 7,
}: Props) {
  const today = format(new Date(), "yyyy-MM-dd");
  const from = format(new Date(Date.now() - historyDays * 86400000), "yyyy-MM-dd");
  const [groups, noteTypes] = await Promise.all([
    showHistory ? getAnalysisTimeline(tickerId, from) : Promise.resolve([]),
    listNoteTypeConfigs(),
  ]);

  return (
    <section className="space-y-4" id="journal-analisis">
      <div className="flex flex-wrap justify-between gap-2 items-center">
        <div>
          <h2 className="text-lg font-semibold text-investep-navy">
            Journal de análisis (notas con tipo)
          </h2>
          <p className="text-xs text-gray-600">
            Tipos: <span className="text-blue-800">Nota</span> ·{" "}
            <span className="text-amber-800">Predicción</span> ·{" "}
            <span className="text-red-800">Error</span>
          </p>
        </div>
        <Link
          href={`/tickers/${symbol}/analysis`}
          className="text-sm text-investep-navy underline font-medium"
        >
          Ver todo + exportar IA →
        </Link>
      </div>

      <AddAnalysisForm
        tickerId={tickerId}
        symbol={symbol}
        defaultDate={today}
        tickerWeekId={tickerWeekId}
        compact
        noteTypes={noteTypes.map((t) => ({
          code: t.code,
          label: t.label,
          hint: t.hint,
        }))}
      />

      {showHistory && groups.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-investep-navy mb-2">
            Últimos {historyDays} días
          </h3>
          <AnalysisTimeline groups={groups} />
        </div>
      )}
    </section>
  );
}
