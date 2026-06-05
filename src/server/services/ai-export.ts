import { AnalysisType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatSymbol, decimalToString } from "@/lib/utils";
import { formatWeekStart, getWeekStart } from "@/lib/week";
import { ensureTickerWeek } from "@/server/services/ticker-week";
import { format, subDays } from "date-fns";

const TYPE_LABELS: Record<AnalysisType, string> = {
  NOTE: "Nota",
  PREDICTION: "Predicción",
  MISTAKE: "Error",
};

function metLabel(value: boolean | null | undefined): string {
  if (value === true) return "Sí";
  if (value === false) return "No";
  return "—";
}

export async function buildAiContextMarkdown(symbol: string, lookbackDays = 14): Promise<string> {
  const normalized = formatSymbol(symbol);
  const ticker = await prisma.ticker.findUnique({
    where: { symbol: normalized },
  });

  if (!ticker) {
    return `# ${normalized}\n\nTicker no encontrado en el journal.\n`;
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const fromDate = subDays(new Date(), lookbackDays);
  const weekStart = formatWeekStart(getWeekStart());

  const [entries, tickerWeek] = await Promise.all([
    prisma.analysisEntry.findMany({
      where: {
        tickerId: ticker.id,
        entryDate: { gte: fromDate },
      },
      orderBy: [{ entryDate: "asc" }, { entryAt: "asc" }, { id: "asc" }],
    }),
    ensureTickerWeek(normalized, weekStart).catch(() => null),
  ]);

  const lines: string[] = [
    `# Contexto InvestJournal — ${normalized}`,
    ``,
    `**Generado:** ${today}`,
    `**Ventana análisis:** últimos ${lookbackDays} días`,
    ``,
    `---`,
    ``,
    `## Instrucción para IA`,
    ``,
    `Genera la **primera nota del día** para ${normalized} con este formato:`,
    ``,
    `- Sesgo: Alcista | Bajista | Neutral`,
    `- Probabilidades (suman 100%): Alcista __% | Bajista __% | Lateral __%`,
    `- Niveles clave (soporte / resistencia)`,
    `- Catalizadores hoy`,
    `- Plan (entrada, invalidación, objetivo)`,
    `- Riesgo principal`,
    ``,
    `---`,
    ``,
    `## Journal de análisis (cronológico)`,
    ``,
  ];

  if (entries.length === 0) {
    lines.push(`_Sin entradas en el período._`, ``);
  } else {
    let lastDate = "";
    for (const e of entries) {
      const d = e.entryDate.toISOString().slice(0, 10);
      if (d !== lastDate) {
        lines.push(`### ${d}`, ``);
        lastDate = d;
      }
      const time = e.entryAt.toISOString().slice(11, 16);
      lines.push(
        `**${time}** · ${TYPE_LABELS[e.type]}`,
        ``,
        e.body,
        ``,
        `---`,
        ``
      );
    }
  }

  if (tickerWeek) {
    const c = tickerWeek.weeklyChecklist;
    lines.push(
      `## Semana actual (desde ${weekStart})`,
      ``,
      `**Rango precio:** ${decimalToString(tickerWeek.priceRangeLow) || "—"} – ${decimalToString(tickerWeek.priceRangeHigh) || "—"}`,
      ``
    );

    if (c) {
      lines.push(
        `| Requisito | Cumple |`,
        `|-----------|--------|`,
        `| FED | ${metLabel(c.fedMet)} |`,
        `| Earnings | ${metLabel(c.earningsMet)} |`,
        `| Bollinger | ${metLabel(c.bollingerMet)} |`,
        `| Promedios móviles | ${metLabel(c.maMet)} |`,
        `| Ruptura tendencia | ${metLabel(c.trendBreakMet)} |`,
        `| Gap up | ${metLabel(c.gapUpMet)} |`,
        `| Gap down | ${metLabel(c.gapDownMet)} |`,
        `| Bid-Ask | ${metLabel(c.bidAskMet)} | dif. ${decimalToString(c.bid) || "—"} |`,
        ``
      );
    }

    lines.push(`### Métricas diarias (L–V)`, ``, `| Día | Distancia | Spot | Strike |`, `|-----|-----------|------|--------|`);
    for (const m of tickerWeek.dailyMetrics) {
      lines.push(
        `| ${m.dayOfWeek} (${m.tradeDate.toISOString().slice(0, 10)}) | ${decimalToString(m.distance) || "—"} | ${decimalToString(m.spotPrice) || "—"} | ${decimalToString(m.strikePrice) || "—"} |`
      );
    }
    lines.push(``);

    if (tickerWeek.trades.length > 0) {
      lines.push(`### Operaciones esta semana`, ``);
      for (const t of tickerWeek.trades) {
        lines.push(
          `- ${t.tradeDate?.toISOString().slice(0, 10) ?? "?"} ${t.optionType ?? ""} · contratos ${t.contracts ?? "—"} · P&L $${decimalToString(t.profitabilityUsd) || "—"} · plan ${decimalToString(t.planPercent) || "—"}%`
        );
      }
      lines.push(``);
    }
  }

  if (ticker.notes) {
    lines.push(`## Notas del ticker`, ``, ticker.notes, ``);
  }

  return lines.join("\n");
}
