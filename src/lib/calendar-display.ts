import type { FinanceAiMonthCalendar } from "@/lib/finance-ai-types";

export function upcomingSymbolEarnings(
  monthCal: FinanceAiMonthCalendar | null | undefined,
  refDate: string
): NonNullable<FinanceAiMonthCalendar["symbolEarnings"]> {
  return (monthCal?.symbolEarnings ?? [])
    .filter((e): e is { date: string; hour?: string; symbol?: string } => Boolean(e.date && e.date >= refDate))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatSymbolEarningsEntry(
  entry: { date?: string; hour?: string },
  todayEt?: string | null
): string {
  const date = entry.date ?? "";
  const todayMark = todayEt && date === todayEt ? " (hoy)" : "";
  const hour = entry.hour ? ` ${entry.hour}` : "";
  return `${date}${todayMark}${hour}`.trim();
}

export function formatUpcomingFomc(
  monthCal: FinanceAiMonthCalendar | null | undefined,
  refDate: string
): string | null {
  const dates = (monthCal?.fomcDates ?? [])
    .filter((f) => f.date && f.date >= refDate)
    .map((f) => `${f.date}${f.sep ? " SEP" : ""}`);
  return dates.length > 0 ? dates.join(" · ") : null;
}

export function formatUpcomingEarnings(
  monthCal: FinanceAiMonthCalendar | null | undefined,
  refDate: string,
  todayEt?: string | null
): string | null {
  const upcoming = upcomingSymbolEarnings(monthCal, refDate);
  if (upcoming.length === 0) return null;
  return upcoming.map((e) => formatSymbolEarningsEntry(e, todayEt)).join(" · ");
}
