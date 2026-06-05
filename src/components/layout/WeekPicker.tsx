"use client";

import { useRouter } from "next/navigation";
import { formatWeekStart, getWeekStart } from "@/lib/week";

type Props = {
  currentWeekStart: string;
  basePath?: string;
};

export function WeekPicker({ currentWeekStart, basePath }: Props) {
  const router = useRouter();
  const todayWeek = formatWeekStart(getWeekStart());

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-investep-navy">Semana (lunes):</span>
      <input
        type="week"
        defaultValue={toHtmlWeekValue(currentWeekStart)}
        onChange={(e) => {
          const monday = fromHtmlWeekValue(e.target.value);
          if (!monday) return;
          if (basePath) {
            router.push(`${basePath}/${monday}`);
          } else {
            router.push(`?week=${monday}`);
          }
        }}
        className="bg-white"
      />
      {currentWeekStart !== todayWeek && (
        <button
          type="button"
          className="text-investep-navy underline text-xs"
          onClick={() => {
            if (basePath) router.push(`${basePath}/${todayWeek}`);
            else router.push(`?week=${todayWeek}`);
          }}
        >
          Semana actual
        </button>
      )}
    </label>
  );
}

function toHtmlWeekValue(mondayIso: string): string {
  const d = new Date(mondayIso + "T12:00:00");
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + 3);
  const year = thursday.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((thursday.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function fromHtmlWeekValue(value: string): string | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - day + 1 + (week - 1) * 7);
  return formatWeekStart(monday);
}
