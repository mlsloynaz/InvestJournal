import { notFound } from "next/navigation";
import { format } from "date-fns";
import { TickerNav } from "@/components/layout/TickerNav";
import { AddAnalysisForm } from "@/components/analysis/AddAnalysisForm";
import { AnalysisTimeline } from "@/components/analysis/AnalysisTimeline";
import { ExportForAi } from "@/components/analysis/ExportForAi";
import { getTickerBySymbol } from "@/server/actions/tickers";
import { getAnalysisTimeline } from "@/server/actions/analysis";
import { ensureTickerWeek } from "@/server/services/ticker-week";
import { listNoteTypeConfigs } from "@/server/services/note-types";
import { formatSymbol } from "@/lib/utils";
import { formatWeekStart, getWeekStart } from "@/lib/week";

type Props = {
  params: Promise<{ symbol: string }>;
};

export default async function AnalysisPage({ params }: Props) {
  const { symbol: raw } = await params;
  const symbol = formatSymbol(raw);
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = formatWeekStart(getWeekStart());

  const ticker = await getTickerBySymbol(symbol);
  if (!ticker) notFound();

  const from = format(new Date(Date.now() - 30 * 86400000), "yyyy-MM-dd");
  const [groups, noteTypes] = await Promise.all([
    getAnalysisTimeline(ticker.id, from),
    listNoteTypeConfigs(),
  ]);

  let tickerWeekId: number | undefined;
  try {
    const tw = await ensureTickerWeek(symbol, weekStart);
    tickerWeekId = tw.id;
  } catch {
    tickerWeekId = undefined;
  }

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">{symbol} — Análisis diario</h1>
        <p className="text-sm text-gray-600 mt-1">
          Aquí registras <strong>notas con tipo</strong> (Nota, Predicción, Error). Cada guardado
          queda bajo su fecha en orden cronológico.
        </p>
      </header>

      <TickerNav symbol={symbol} active="analysis" weekStart={weekStart} />

      <section className="rounded-lg border-2 border-investep-navy/20 bg-white/60 p-1">
        <div className="bg-investep-navy text-white text-center text-xs py-1 rounded-t font-medium">
          PASO 1 — Escribir nota
        </div>
        <div className="p-2">
          <AddAnalysisForm
            tickerId={ticker.id}
            symbol={symbol}
            defaultDate={today}
            tickerWeekId={tickerWeekId}
            noteTypes={noteTypes.map((t) => ({
              code: t.code,
              label: t.label,
              hint: t.hint,
            }))}
          />
        </div>
      </section>

      <section>
        <div className="bg-investep-navy text-white text-xs py-1 px-3 rounded-t font-medium inline-block">
          PASO 2 (opcional) — Contexto para IA
        </div>
        <ExportForAi symbol={symbol} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-investep-navy mb-3">Historial (30 días)</h2>
        <AnalysisTimeline groups={groups} />
      </section>
    </div>
  );
}
