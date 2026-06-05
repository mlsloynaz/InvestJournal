import {
  addDays,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfWeek,
} from "date-fns";

export const WEEK_STARTS_ON = 1 as const;

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
}

export function formatWeekStart(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseWeekStart(value: string): Date {
  return startOfWeek(parseISO(value), { weekStartsOn: WEEK_STARTS_ON });
}

export function getWeekMeta(weekStart: Date): { year: number; isoWeek: number } {
  return {
    year: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
  };
}

export function getWeekdayDates(weekStart: Date): Date[] {
  return [0, 1, 2, 3, 4].map((offset) => addDays(weekStart, offset));
}

export const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] as const;
