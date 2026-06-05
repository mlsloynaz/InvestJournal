import { TOOLS_PLAN_INVERSION_PATH } from "@/lib/tools-paths";

export type InvestmentPlanModeKey = "P35" | "P10";
export type PlanAccountKey = "real" | "practice";

export const PLAN_MODE_LABELS: Record<InvestmentPlanModeKey, string> = {
  P35: "Modo 35%",
  P10: "Modo 10%",
};

export const PLAN_ACCOUNT_LABELS: Record<PlanAccountKey, string> = {
  real: "Real",
  practice: "Práctica",
};

export const PLAN_MODE_RATE: Record<InvestmentPlanModeKey, number> = {
  P35: 35,
  P10: 10,
};

export function parseModeParam(value: string | undefined): InvestmentPlanModeKey {
  return value === "P10" ? "P10" : "P35";
}

export function parseAccountParam(value: string | undefined): PlanAccountKey {
  return value === "practice" ? "practice" : "real";
}

export function planInversionHref(
  mode: InvestmentPlanModeKey,
  account: PlanAccountKey,
  showRealTotal?: boolean
): string {
  const q = new URLSearchParams({ mode, account });
  if (showRealTotal) q.set("showRealTotal", "1");
  return `${TOOLS_PLAN_INVERSION_PATH}?${q.toString()}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function decimalToNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return parseFloat(value.toString());
}

export function formatMoney(n: number): string {
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
}

export function yearMonthFromParts(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function yearMonthFromDate(d: Date): string {
  return yearMonthFromParts(d.getFullYear(), d.getMonth() + 1);
}

export function weekOfMonthFromDate(d: Date): number {
  return Math.ceil(d.getDate() / 7);
}

export function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es", { month: "long", year: "numeric" });
}

export function weekLabel(yearMonth: string, weekOfMonth: number): string {
  return `${monthLabel(yearMonth)} — Semana ${weekOfMonth}`;
}

export function suggestedInvest(priorCapital: number, dailyInvestPercent: number): number {
  return round2(priorCapital * (dailyInvestPercent / 100));
}

export function suggestedRentabilidad(investAmount: number, modeRatePercent: number): number {
  return round2(investAmount * (modeRatePercent / 100));
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type PlanEntryView = {
  id: number;
  entryDate: string;
  yearMonth: string;
  weekOfMonth: number;
  ticker: string | null;
  isPractice: boolean;
  investAmount: number;
  rentabilidad: number;
  capital: number;
};

export type PlanMonthView = {
  yearMonth: string;
  entries: PlanEntryView[];
};

export type WeekTickerReportRow = {
  yearMonth: string;
  weekOfMonth: number;
  label: string;
  tickers: { ticker: string; investAmount: number; rentabilidad: number }[];
  weekTotal: number;
};

export type TickerReportRow = {
  ticker: string;
  investAmount: number;
  rentabilidad: number;
  entryCount: number;
};

export function sumRentabilidad(entries: PlanEntryView[], untilDate?: string): number {
  return round2(
    entries
      .filter((e) => !untilDate || e.entryDate <= untilDate)
      .reduce((s, e) => s + e.rentabilidad, 0)
  );
}

export function buildReportByWeekAndTicker(entries: PlanEntryView[]): WeekTickerReportRow[] {
  const groups = new Map<string, PlanEntryView[]>();
  for (const e of entries) {
    const key = `${e.yearMonth}|${e.weekOfMonth}`;
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, weekEntries]) => {
      const [yearMonth, weekStr] = key.split("|");
      const weekOfMonth = Number(weekStr);
      const byTicker = new Map<string, { investAmount: number; rentabilidad: number }>();

      for (const e of weekEntries) {
        const t = e.ticker ?? "(sin ticker)";
        const cur = byTicker.get(t) ?? { investAmount: 0, rentabilidad: 0 };
        cur.investAmount = round2(cur.investAmount + e.investAmount);
        cur.rentabilidad = round2(cur.rentabilidad + e.rentabilidad);
        byTicker.set(t, cur);
      }

      const tickers = Array.from(byTicker.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ticker, v]) => ({ ticker, ...v }));

      return {
        yearMonth,
        weekOfMonth,
        label: weekLabel(yearMonth, weekOfMonth),
        tickers,
        weekTotal: round2(tickers.reduce((s, t) => s + t.rentabilidad, 0)),
      };
    });
}

export function buildReportByTicker(entries: PlanEntryView[]): TickerReportRow[] {
  const byTicker = new Map<string, { investAmount: number; rentabilidad: number; entryCount: number }>();

  for (const e of entries) {
    const t = e.ticker ?? "(sin ticker)";
    const cur = byTicker.get(t) ?? { investAmount: 0, rentabilidad: 0, entryCount: 0 };
    cur.investAmount = round2(cur.investAmount + e.investAmount);
    cur.rentabilidad = round2(cur.rentabilidad + e.rentabilidad);
    cur.entryCount += 1;
    byTicker.set(t, cur);
  }

  return Array.from(byTicker.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ticker, v]) => ({ ticker, ...v }));
}

export function groupEntriesByMonth(entries: PlanEntryView[]): PlanMonthView[] {
  const byMonth = new Map<string, PlanEntryView[]>();
  for (const e of entries) {
    const list = byMonth.get(e.yearMonth) ?? [];
    list.push(e);
    byMonth.set(e.yearMonth, list);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([yearMonth, monthEntries]) => ({
      yearMonth,
      entries: monthEntries.sort((a, b) => a.entryDate.localeCompare(b.entryDate)),
    }));
}
