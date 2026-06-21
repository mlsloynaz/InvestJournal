"use client";

import type {
  FinanceAiMarketFoundation,
  FinanceAiPanoramaCompleto,
} from "@/lib/finance-ai-types";

const TF_ORDER = ["D", "1h", "15m"] as const;
const TF_LABEL: Record<string, string> = {
  D: "Día",
  "1h": "Hora",
  "15m": "15m",
};

const DIR_CLASS: Record<string, string> = {
  bullish: "text-green-800",
  bearish: "text-red-800",
  lateral: "text-amber-800",
  unknown: "text-gray-600",
};

const DIR_LABEL: Record<string, string> = {
  bullish: "alcista",
  bearish: "bajista",
  lateral: "lateral",
  unknown: "—",
};

type Props = {
  foundation?: FinanceAiMarketFoundation | null;
  trendsFromChecklist?: FinanceAiMarketFoundation["trends"];
  panorama?: FinanceAiPanoramaCompleto | null;
  defaultCollapsed?: boolean;
};

export function MarketAiFoundationTrends({
  foundation,
  trendsFromChecklist,
  panorama: panoramaProp,
  defaultCollapsed = true,
}: Props) {
  const panorama =
    panoramaProp ??
    foundation?.panoramaCompleto ??
    null;
  const trends = panorama?.timeframes
    ? undefined
    : foundation?.trends ?? trendsFromChecklist;
  const trendline = panorama?.trendline1h ?? foundation?.trendline1h;

  if (!panorama?.ready && !trends && !trendline) return null;

  const phaseLabel = panorama?.phase ? ` · ${panorama.phase}` : "";

  return (
    <details
      className="text-xs bg-slate-50 border border-slate-200 rounded group"
      open={!defaultCollapsed}
    >
      <summary className="cursor-pointer select-none font-medium text-investep-navy p-2 list-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-gray-400 group-open:rotate-90 transition-transform" aria-hidden>
            ▸
          </span>
          Panorama (D → H → 15m)
          {phaseLabel && <span className="text-gray-500 font-normal">{phaseLabel}</span>}
        </span>
      </summary>
      <div className="px-2 pb-2 space-y-1.5 border-t border-slate-200/80">

      {panorama?.ready && panorama.summaryLines && panorama.summaryLines.length > 0 && (
        <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
          {panorama.summaryLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      {!panorama?.ready && trends && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {TF_ORDER.map((tf) => {
            const row = trends[tf];
            if (!row?.direction) return null;
            const dir = row.direction;
            return (
              <span key={tf} className={DIR_CLASS[dir] ?? "text-gray-700"} title={row.evidence}>
                {TF_LABEL[tf]}: {DIR_LABEL[dir] ?? dir}
                {row.maStack && row.maStack !== "unknown" && (
                  <span className="text-gray-500"> · MA {row.maStack}</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {panorama?.ready &&
        TF_ORDER.map((tf) => {
          const row = panorama.timeframes?.[tf];
          if (!row?.available) return null;
          const trend = row.trend;
          const bb = row.bollinger;
          const dir = trend?.direction ?? "unknown";
          return (
            <div key={tf} className="border-t border-slate-200/80 pt-1 space-y-0.5">
              <p className={DIR_CLASS[dir] ?? "text-gray-700"}>
                <span className="font-medium">{TF_LABEL[tf]}:</span> {DIR_LABEL[dir] ?? dir}
                {trend?.maStack && trend.maStack !== "unknown" && (
                  <span className="text-gray-500"> · MA {trend.maStack}</span>
                )}
                {bb?.volState && (
                  <span className="text-gray-600"> · vol BB {bb.volState}</span>
                )}
                {bb?.position && bb.position !== "inside" && (
                  <span className="text-gray-600"> · {bb.position}</span>
                )}
              </p>
              {(row.nearestSupport != null || row.nearestResistance != null) && (
                <p className="text-gray-600">
                  S/R: sop {row.nearestSupport ?? "—"} · res {row.nearestResistance ?? "—"}
                </p>
              )}
              {(row.maRoles?.length ?? 0) > 0 && (
                <p className="text-gray-600">
                  MAs:{" "}
                  {row.maRoles!
                    .slice(0, 3)
                    .map((m) => `MA${m.period} ${m.role} (${m.distancePct}%)`)
                    .join(" · ")}
                </p>
              )}
            </div>
          );
        })}

      {trendline?.lineValid && trendline.linePriceNow != null && (
        <p className="text-gray-700 border-t border-slate-200/80 pt-1">
          Línea 1h {trendline.direction ?? "—"} @ {trendline.linePriceNow}
          {trendline.priceVsLine && ` · precio ${trendline.priceVsLine}`}
        </p>
      )}

      {(panorama?.flags?.length ?? 0) > 0 && (
        <ul className="list-none space-y-0.5 border-t border-slate-200/80 pt-1">
          {panorama!.flags!.map((f) => (
            <li
              key={f.id ?? f.message}
              className={f.severity === "warn" ? "text-amber-800" : "text-gray-600"}
            >
              {f.severity === "warn" ? "⚠ " : "· "}
              {f.message}
            </li>
          ))}
        </ul>
      )}

      {(panorama?.strategyHints?.length ?? 0) > 0 && (
        <div className="border-t border-slate-200/80 pt-1 text-gray-600">
          <p className="font-medium text-slate-800">Impacto en estrategias</p>
          <ul className="list-disc pl-4">
            {panorama!.strategyHints!.map((h) => (
              <li key={h.message}>{h.message}</li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </details>
  );
}
