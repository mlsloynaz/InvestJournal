"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { NowPollIntervalSelection } from "@/lib/now-polling-session";
import { NOW_POLL_INTERVAL_OPTIONS } from "@/lib/now-polling-session";
import type { JournalTickerRow } from "@/server/actions/tickers";
import { createJournalTicker, deleteTicker, setAllTickersFavorite, updateJournalTicker } from "@/server/actions/tickers";
import { saveNowPollIntervals } from "@/server/actions/finance-ai-now-schedules";
import { formatMinMaxLabel, formatRangoOptimoLabel } from "@/lib/rango-optimo-display";
import { CollapsibleConfigSection } from "@/components/config/CollapsibleConfigSection";
import { TickerFavoriteToggle } from "@/components/config/TickerFavoriteToggle";
import { NowPollIntervalRadios } from "@/components/config/NowPollIntervalEditor";

type Props = {
  rows: JournalTickerRow[];
  configured: boolean;
  rangoSymbols?: string[];
};

type ListFilter = "all" | NowPollIntervalSelection;

function hasRangoOptimo(row: JournalTickerRow): boolean {
  return (
    row.priceOptimo != null ||
    row.rangoOptimoLow != null ||
    row.rangoOptimoHigh != null ||
    row.minPrice != null ||
    row.maxPrice != null
  );
}

function filterChipClass(active: boolean): string {
  return active
    ? "bg-investep-navy text-white border-investep-navy"
    : "bg-white text-investep-navy border-investep-navy/30 hover:bg-slate-50";
}

function rowsToDraft(rows: JournalTickerRow[]): Record<string, NowPollIntervalSelection> {
  const draft: Record<string, NowPollIntervalSelection> = {};
  for (const row of rows) {
    draft[row.symbol] = row.pollInterval;
  }
  return draft;
}

function priceFieldValue(n: number | null | undefined): string {
  return n != null && Number.isFinite(n) ? String(n) : "";
}

function JournalTickerRangoFields({ row }: { row?: JournalTickerRow }) {
  return (
    <fieldset className="text-sm border border-gray-100 rounded px-2 py-2 bg-white">
      <legend className="text-[10px] uppercase tracking-wide text-gray-500 px-1">
        Rango óptimo (opcional)
      </legend>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
        <label className="text-xs">
          Low $
          <input
            type="number"
            step="0.01"
            min="0"
            name="rangoOptimoLow"
            defaultValue={priceFieldValue(row?.rangoOptimoLow)}
            className="block mt-0.5 w-full text-xs"
          />
        </label>
        <label className="text-xs">
          High $
          <input
            type="number"
            step="0.01"
            min="0"
            name="rangoOptimoHigh"
            defaultValue={priceFieldValue(row?.rangoOptimoHigh)}
            className="block mt-0.5 w-full text-xs"
          />
        </label>
        <label className="text-xs">
          Mín $
          <input
            type="number"
            step="0.01"
            min="0"
            name="minPrice"
            defaultValue={priceFieldValue(row?.minPrice)}
            className="block mt-0.5 w-full text-xs"
          />
        </label>
        <label className="text-xs">
          Máx $
          <input
            type="number"
            step="0.01"
            min="0"
            name="maxPrice"
            defaultValue={priceFieldValue(row?.maxPrice)}
            className="block mt-0.5 w-full text-xs"
          />
        </label>
      </div>
    </fieldset>
  );
}

function JournalTickerEditForm({
  row,
  interval,
  onCancel,
}: {
  row: JournalTickerRow;
  interval: NowPollIntervalSelection;
  onCancel: () => void;
}) {
  return (
    <form action={updateJournalTicker} className="space-y-2.5">
      <input type="hidden" name="id" value={row.id} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          Símbolo *
          <input
            name="symbol"
            required
            defaultValue={row.symbol}
            className="block mt-1 w-full uppercase"
          />
        </label>
        <label className="text-sm">
          Nombre
          <input name="name" defaultValue={row.name ?? ""} className="block mt-1 w-full" />
        </label>
      </div>
      <label className="text-sm block">
        Notas
        <textarea
          name="notes"
          rows={2}
          defaultValue={row.notes ?? ""}
          className="block mt-1 w-full text-sm"
        />
      </label>
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          name="isFavorite"
          value="1"
          defaultChecked={row.isFavorite}
          className="h-4 w-4"
        />
        <span>★ Favorito</span>
      </label>
      <JournalTickerRangoFields row={row} />
      <fieldset className="text-sm border border-gray-100 rounded px-2 py-2">
        <legend className="text-[10px] uppercase tracking-wide text-gray-500 px-1">
          Intervalo NOW
        </legend>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {NOW_POLL_INTERVAL_OPTIONS.map((opt) => (
            <label key={opt.value} className="inline-flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="radio"
                name="pollInterval"
                value={opt.value}
                defaultChecked={interval === opt.value}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="text-sm">
          Guardar
        </button>
        <button
          type="button"
          className="!bg-transparent !text-investep-navy underline text-sm !p-0"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function JournalTickerAddForm({
  rangoSymbols,
  onCancel,
}: {
  rangoSymbols: string[];
  onCancel: () => void;
}) {
  const listId = "journal-add-ticker-symbols";

  return (
    <form
      action={createJournalTicker}
      className="rounded border border-dashed border-investep-navy/30 bg-slate-50/50 px-2 py-2 space-y-2.5"
    >
      <p className="text-xs font-medium text-investep-navy">Nuevo ticker</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          Símbolo *
          <input
            type="text"
            name="symbol"
            required
            list={rangoSymbols.length > 0 ? listId : undefined}
            placeholder="TSLA"
            className="block mt-1 w-full uppercase"
            autoComplete="off"
          />
          {rangoSymbols.length > 0 ? (
            <datalist id={listId}>
              {rangoSymbols.map((symbol) => (
                <option key={symbol} value={symbol} />
              ))}
            </datalist>
          ) : null}
        </label>
        <label className="text-sm">
          Nombre
          <input name="name" className="block mt-1 w-full" />
        </label>
      </div>
      <label className="text-sm block">
        Notas
        <textarea name="notes" rows={2} className="block mt-1 w-full text-sm" />
      </label>
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" name="isFavorite" value="1" className="h-4 w-4" />
        <span>★ Favorito</span>
      </label>
      <JournalTickerRangoFields />
      <fieldset className="text-sm border border-gray-100 rounded px-2 py-2 bg-white">
        <legend className="text-[10px] uppercase tracking-wide text-gray-500 px-1">
          Intervalo NOW
        </legend>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {NOW_POLL_INTERVAL_OPTIONS.map((opt) => (
            <label key={opt.value} className="inline-flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="radio"
                name="pollInterval"
                value={opt.value}
                defaultChecked={opt.value === "none"}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="text-sm">
          Agregar
        </button>
        <button
          type="button"
          className="!bg-transparent !text-investep-navy underline text-sm !p-0"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function JournalTickerRowCard({
  row,
  interval,
  pending,
  editing,
  onEdit,
  onCancelEdit,
  onDraftChange,
  onFavoriteToggled,
}: {
  row: JournalTickerRow;
  interval: NowPollIntervalSelection;
  pending: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onDraftChange: (symbol: string, interval: NowPollIntervalSelection) => void;
  onFavoriteToggled: (id: number, symbol: string, isFavorite: boolean) => void;
}) {
  const minMax = formatMinMaxLabel(row);
  const rango = formatRangoOptimoLabel(row);

  if (editing) {
    return (
      <article className="rounded border border-amber-200 bg-amber-50/50 px-2 py-2">
        <JournalTickerEditForm
          row={row}
          interval={interval}
          onCancel={onCancelEdit}
        />
      </article>
    );
  }

  return (
    <article
      className={`rounded border px-2 py-1.5 space-y-1 ${
        row.isFavorite
          ? "border-investep-gold/35 bg-investep-cream/25"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <TickerFavoriteToggle
          id={row.id}
          isFavorite={row.isFavorite}
          compact
          disabled={pending}
          onToggled={(next) => onFavoriteToggled(row.id, row.symbol, next)}
        />
        <span className="font-mono font-semibold text-sm text-investep-navy shrink-0">
          {row.symbol}
        </span>
        {row.name ? (
          <span className="text-xs text-gray-600 truncate min-w-0">{row.name}</span>
        ) : null}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="text-[10px] bg-investep-navy text-white px-1.5 py-0.5 rounded"
          >
            Editar
          </button>
          <form
            action={deleteTicker}
            className="inline"
            onSubmit={(e) => {
              const label = row.name ? `${row.symbol} (${row.name})` : row.symbol;
              if (
                !confirm(
                  `¿Eliminar "${label}"?${
                    hasRangoOptimo(row)
                      ? " Se ocultará del journal (sigue en rangos óptimos)."
                      : " Se borrará del catálogo."
                  }`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={row.id} />
            <button type="submit" className="!bg-red-700 !px-1.5 !py-0.5 !text-[10px]">
              Eliminar
            </button>
          </form>
        </div>
      </div>

      <p className="text-[10px] text-gray-600 tabular-nums leading-tight">
        {hasRangoOptimo(row) ? (
          <>
            <span className="text-gray-400">Rango</span> {rango}
            {minMax ? (
              <>
                <span className="text-gray-300 mx-1">·</span>
                <span className="text-gray-400">Mín/Máx</span> {minMax}
              </>
            ) : null}
          </>
        ) : (
          <span className="text-gray-500 italic">Manual · sin rango óptimo</span>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-[10px] text-gray-400 shrink-0">NOW</span>
        <NowPollIntervalRadios
          symbol={row.symbol}
          value={interval}
          disabled={pending || !row.isFavorite}
          compact
          onChange={onDraftChange}
        />
        {!row.isFavorite ? (
          <span className="text-[10px] text-gray-400">(★ para NOW)</span>
        ) : null}
      </div>
    </article>
  );
}

export function JournalTickersPanel({ rows, configured, rangoSymbols = [] }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [draft, setDraft] = useState<Record<string, NowPollIntervalSelection>>(() =>
    rowsToDraft(rows)
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setDraft(rowsToDraft(rows));
  }, [rows]);

  useEffect(() => {
    setFavoriteOverrides({});
  }, [rows]);

  const rowsWithFavorites = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        isFavorite: favoriteOverrides[row.id] ?? row.isFavorite,
      })),
    [rows, favoriteOverrides]
  );

  const favorites = useMemo(
    () => rowsWithFavorites.filter((r) => r.isFavorite),
    [rowsWithFavorites]
  );
  const favoriteCount = favorites.length;
  const allFavorites = rows.length > 0 && favoriteCount === rows.length;
  const noneFavorites = favoriteCount === 0;

  const intervalCounts = useMemo(() => {
    const counts: Partial<Record<NowPollIntervalSelection, number>> = {};
    for (const opt of NOW_POLL_INTERVAL_OPTIONS) {
      counts[opt.value] = 0;
    }
    for (const row of favorites) {
      const interval = draft[row.symbol] ?? row.pollInterval;
      counts[interval] = (counts[interval] ?? 0) + 1;
    }
    return counts;
  }, [favorites, draft]);

  const subtitle =
    rows.length === 0
      ? "Importa rangos óptimos para cargar tickers del journal"
      : `${favoriteCount} ★ favorito(s) · ${rows.length} en catálogo · intervalos 1 / 5 / 10 / 30 / 1 h`;

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();

    let list = q
      ? rowsWithFavorites.filter(
          (row) =>
            row.symbol.toUpperCase().includes(q) ||
            (row.name?.toUpperCase().includes(q) ?? false)
        )
      : favorites;

    if (listFilter !== "all") {
      list = list.filter((row) => (draft[row.symbol] ?? row.pollInterval) === listFilter);
    }

    return list;
  }, [rowsWithFavorites, favorites, query, listFilter, draft]);

  const hasActiveFilters = listFilter !== "all" || query.trim().length > 0;

  const dirty = useMemo(() => {
    return rowsWithFavorites.some(
      (row) => (draft[row.symbol] ?? row.pollInterval) !== row.pollInterval
    );
  }, [rowsWithFavorites, draft]);

  function onFavoriteToggled(id: number, symbol: string, isFavorite: boolean) {
    setFavoriteOverrides((prev) => ({ ...prev, [id]: isFavorite }));
    setMessage(
      isFavorite ? `${symbol} marcado ★ favorito.` : `${symbol} quitado de favoritos.`
    );
  }

  function onDraftChange(symbol: string, interval: NowPollIntervalSelection) {
    setDraft((prev) => ({ ...prev, [symbol]: interval }));
    setMessage(null);
  }

  function onSaveIntervals() {
    startTransition(async () => {
      setMessage(null);
      const result = await saveNowPollIntervals(draft);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo guardar intervalos");
        return;
      }
      setMessage(`Intervalos NOW guardados en MySQL · ${result.saved ?? 0} ticker(s)`);
    });
  }

  function onSetAllFavorites(isFavorite: boolean) {
    if (rows.length === 0) return;
    if (!isFavorite) {
      if (
        !confirm(
          `¿Quitar ★ de los ${rows.length} ticker(s) del catálogo? Dejarán de aparecer en favoritos y NOW hasta que los marques de nuevo.`
        )
      ) {
        return;
      }
    }
    startTransition(async () => {
      setMessage(null);
      const result = await setAllTickersFavorite(isFavorite);
      if (!result.success) {
        setMessage(result.error ?? "No se pudieron actualizar favoritos");
        return;
      }
      setMessage(
        isFavorite
          ? `★ Marcados ${result.updated ?? rows.length} ticker(s) como favoritos.`
          : `☆ Quitado ★ de ${result.updated ?? rows.length} ticker(s).`
      );
    });
  }

  return (
    <CollapsibleConfigSection
      title="Journal tickers · ★ favoritos · NOW"
      subtitle={subtitle}
      defaultOpen={false}
      headerExtraWhenOpenOnly
      headerExtra={
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSetAllFavorites(true)}
            disabled={pending || rows.length === 0 || allFavorites}
            className="text-sm font-medium px-3 py-2 rounded-lg border border-investep-gold/50 text-investep-navy bg-investep-cream/40 hover:bg-investep-cream/70 disabled:opacity-50"
            title="Marcar todos los tickers del catálogo como favoritos"
          >
            ★ Todos
          </button>
          <button
            type="button"
            onClick={() => onSetAllFavorites(false)}
            disabled={pending || rows.length === 0 || noneFavorites}
            className="text-sm font-medium px-3 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-slate-50 disabled:opacity-50"
            title="Quitar favorito de todos los tickers del catálogo"
          >
            ☆ Ninguno
          </button>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="text-sm font-medium px-3 py-2 rounded-lg border border-investep-navy/30 text-investep-navy hover:bg-slate-50"
          >
            {showAdd ? "Cerrar" : "+ Agregar ticker"}
          </button>
          <button
            type="button"
            onClick={onSaveIntervals}
            disabled={pending || !dirty || rows.length === 0}
            className="text-sm font-medium !text-white px-4 py-2 rounded-lg shadow-md disabled:opacity-50 !bg-investep-navy hover:opacity-90"
          >
            {pending ? "…" : "Guardar intervalos NOW"}
          </button>
        </div>
      }
    >
      <p className="text-xs text-gray-600">
        Solo se listan <strong>★ favoritos</strong>. Usa <strong>Buscar</strong> para ver el catálogo
        completo y pulsa <strong>☆</strong> junto al símbolo para marcar favorito, o{" "}
        <strong>+ Agregar ticker</strong> para símbolos fuera del Excel de rangos óptimos.
        {!configured ? (
          <span className="block mt-1 text-amber-800">
            FinanceAI no configurado — los intervalos se guardan en MySQL; AWS requiere API URL/KEY.
          </span>
        ) : (
          <span className="block mt-1">
            Activa checks en AWS con <strong>Start Automatic Checks</strong> en Market → Result Now.
          </span>
        )}
      </p>

      {showAdd ? (
        <JournalTickerAddForm
          rangoSymbols={rangoSymbols}
          onCancel={() => setShowAdd(false)}
        />
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          Sin tickers — importa el Excel o agrega uno manualmente.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm min-w-[12rem] flex-1 max-w-xs">
              <span className="text-gray-600 text-xs">Buscar ticker</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="AAPL, Netflix…"
                className="mt-1 block w-full uppercase"
                autoComplete="off"
              />
            </label>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setListFilter("all");
                }}
                className="text-xs text-investep-navy underline pb-1"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Filter by
            </p>
            <div className="flex flex-wrap gap-1.5">
              {NOW_POLL_INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setListFilter(opt.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${filterChipClass(listFilter === opt.value)}`}
                >
                  {opt.label} ({intervalCounts[opt.value] ?? 0})
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Mostrando {filtered.length}
            {query.trim()
              ? ` · búsqueda en ${rowsWithFavorites.length} tickers · pulsa ☆ para favorito`
              : ` ★ favorito(s)`}
          </p>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">
              {query.trim()
                ? `Sin coincidencias para «${query}».`
                : "Sin favoritos — busca un ticker y marca ★."}
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((row) => {
                const interval = draft[row.symbol] ?? row.pollInterval;
                return (
                  <li key={row.id}>
                    <JournalTickerRowCard
                      row={row}
                      interval={interval}
                      pending={pending}
                      editing={editingId === row.id}
                      onEdit={() => setEditingId(row.id)}
                      onCancelEdit={() => setEditingId(null)}
                      onDraftChange={onDraftChange}
                      onFavoriteToggled={onFavoriteToggled}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {message ? (
        <p
          className={`text-sm rounded p-3 border ${
            message.includes("No se") || message.includes("Error")
              ? "text-red-800 bg-red-50 border-red-200"
              : "text-green-800 bg-green-50 border-green-200"
          }`}
        >
          {message}
        </p>
      ) : null}
    </CollapsibleConfigSection>
  );
}
