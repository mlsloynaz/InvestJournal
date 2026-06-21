/** NYSE full-day closures � seed for Config AWS ? No trading days. */
export type UsEquityHoliday = {
  date: string;
  label: string;
};

export const US_EQUITY_HOLIDAYS: UsEquityHoliday[] = [
  { date: "2025-01-01", label: "New Year's Day" },
  { date: "2025-01-09", label: "National Day of Mourning" },
  { date: "2025-01-20", label: "MLK Day" },
  { date: "2025-02-17", label: "Presidents Day" },
  { date: "2025-04-18", label: "Good Friday" },
  { date: "2025-05-26", label: "Memorial Day" },
  { date: "2025-06-19", label: "Juneteenth" },
  { date: "2025-07-04", label: "Independence Day" },
  { date: "2025-09-01", label: "Labor Day" },
  { date: "2025-11-27", label: "Thanksgiving" },
  { date: "2025-12-25", label: "Christmas" },
  { date: "2026-01-01", label: "New Year's Day" },
  { date: "2026-01-19", label: "MLK Day" },
  { date: "2026-02-16", label: "Presidents Day" },
  { date: "2026-04-03", label: "Good Friday" },
  { date: "2026-05-25", label: "Memorial Day" },
  { date: "2026-06-19", label: "Juneteenth" },
  { date: "2026-07-03", label: "Independence Day (observed)" },
  { date: "2026-09-07", label: "Labor Day" },
  { date: "2026-11-26", label: "Thanksgiving" },
  { date: "2026-12-25", label: "Christmas" },
];
