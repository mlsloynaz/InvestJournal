import Link from "next/link";
import { formatWeekStart, getWeekStart } from "@/lib/week";

type Props = {
  symbol: string;
  active: "hub" | "week" | "analysis";
  weekStart?: string;
};

export function TickerNav({ symbol, active, weekStart }: Props) {
  const week = weekStart ?? formatWeekStart(getWeekStart());
  const base = `/tickers/${symbol}`;

  const linkClass = (tab: Props["active"]) =>
    `px-3 py-2 text-sm rounded ${
      active === tab
        ? "bg-investep-navy text-white"
        : "bg-white border text-investep-navy hover:bg-investep-cream"
    }`;

  return (
    <nav className="flex flex-wrap gap-2">
      <Link href={base} className={linkClass("hub")}>
        Resumen
      </Link>
      <Link href={`${base}/weeks/${week}`} className={linkClass("week")}>
        Análisis básico
      </Link>
      <Link href={`${base}/analysis`} className={linkClass("analysis")}>
        Notas
      </Link>
    </nav>
  );
}
