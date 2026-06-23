"use client";

import { useEffect, useState } from "react";
import { ConfigPaneModal } from "@/components/config/ConfigPaneModal";
import { TickerMlongSettingsPanel } from "@/components/config/TickerMlongSettingsPanel";
import type { RangoOptimoEntry } from "@/server/actions/rango-optimo";
import {
  getRangoOptimoLastDate,
  listRangoOptimoEntries,
} from "@/server/actions/rango-optimo";
import { listMlongSymbols } from "@/server/actions/tickers";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (symbols: string[]) => void;
};

export function MarketNowMlongConfigModal({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangoOptimoRows, setRangoOptimoRows] = useState<RangoOptimoEntry[]>([]);
  const [initialMlongTickers, setInitialMlongTickers] = useState<string[]>([]);
  const [lastImportDate, setLastImportDate] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      listRangoOptimoEntries(),
      listMlongSymbols(),
      getRangoOptimoLastDate(),
    ])
      .then(([rows, mlong, lastDate]) => {
        if (cancelled) return;
        setRangoOptimoRows(rows);
        setInitialMlongTickers(mlong);
        setLastImportDate(lastDate);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "No se pudieron cargar los tickers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <ConfigPaneModal
      open={open}
      onClose={onClose}
      title="Movimientos Long"
      subtitle="Tickers enviados a Market / Result Now"
      maxWidthClass="max-w-4xl"
    >
      {loading ? (
        <p className="text-sm text-gray-500">Cargando tickers...</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : (
        <TickerMlongSettingsPanel
          rangoOptimoRows={rangoOptimoRows}
          initialMlongTickers={initialMlongTickers}
          lastImportDate={lastImportDate}
          defaultOpen
          embedded
          onSaved={onSaved}
        />
      )}
    </ConfigPaneModal>
  );
}
