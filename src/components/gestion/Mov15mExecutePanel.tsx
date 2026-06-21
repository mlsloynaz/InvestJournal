"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FinanceAiBolinger15FastMovementTicker } from "@/lib/finance-ai-types";
import { calc10 } from "@/lib/price-calc";
import { resolveBb15PredictedDirection } from "@/lib/bb15-fast-display";
import type {
  FinanceAiTradingOrderSummary,
  FinanceAiTradingPositionStatus,
} from "@/server/services/finance-ai-client";
import {
  cancelFinanceAiMov15mOrder,
  editFinanceAiMov15mOrderLimit,
  fetchFinanceAiMov15mOrderFill,
  fetchFinanceAiMov15mOrders,
  fetchFinanceAiMov15mOrderStatus,
  submitFinanceAiMov15mTradingOrder,
} from "@/server/actions/finance-ai";

const FILL_POLL_MS = 3_000;

type Busy =
  | "buy"
  | "sell"
  | "force_sell"
  | "status"
  | "refresh"
  | `cancel-${string}`
  | `edit-${string}`
  | null;

function formatUsd(value: number | null | undefined): string {
  return value != null && Number.isFinite(value) ? `$${value.toFixed(2)}` : "—";
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(11, 19) || iso.slice(0, 16).replace("T", " ");
}

function sideLabel(side: string | undefined): string {
  if (side === "buy") return "Compra";
  if (side === "sell") return "Limit";
  if (side === "force_sell") return "Force";
  if (side === "sell_now") return "Market";
  return side ?? "?";
}

function statusLabel(status: string | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (s === "bought" || s === "filled") return "Ejecutada";
  if (s === "cancelled") return "Cancelada";
  if (s === "pending_fill") return "Esperando fill";
  if (s === "submitted" || s === "working" || s === "open") return "Activa";
  return status ?? "—";
}

function pnlLabel(direction: string | undefined): string {
  if (direction === "profit") return "Ganando";
  if (direction === "loss") return "Perdiendo";
  if (direction === "flat") return "Plano";
  return "—";
}

function statusTone(status: string | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (s === "bought" || s === "filled") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (s === "cancelled") return "bg-gray-100 text-gray-600 border-gray-200";
  if (s === "pending_fill" || s === "submitted" || s === "working" || s === "open") {
    return "bg-amber-100 text-amber-900 border-amber-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function pnlClass(direction: string | undefined): string {
  if (direction === "profit") return "text-emerald-800";
  if (direction === "loss") return "text-red-800";
  return "text-slate-600";
}

function syncSessionFromOrders(orders: FinanceAiTradingOrderSummary[]) {
  const buy = orders.find(
    (o) =>
      o.side === "buy" &&
      (o.bought || o.status === "bought" || (o.fillPrice != null && o.status !== "cancelled"))
  );
  const openSell = orders.find(
    (o) =>
      (o.side === "sell" || o.side === "force_sell") &&
      o.status !== "cancelled" &&
      !o.fillPrice &&
      o.status !== "filled"
  );
  return {
    buyOrderId: buy?.orderId ?? null,
    fillPrice: buy?.fillPrice ?? null,
    bought: Boolean(buy?.bought || buy?.fillPrice != null),
    sellOrderId: openSell?.orderId ?? null,
    sellLimitPrice: openSell?.limitPrice ?? openSell?.price ?? null,
    fillPollOrderId:
      buy?.fillPollActive && buy.orderId && !buy.fillPrice ? buy.orderId : null,
  };
}

function PositionStatusBlock({ status }: { status: FinanceAiTradingPositionStatus }) {
  if (!status.found) {
    return <p className="text-xs text-red-700">{status.message ?? "Sin status"}</p>;
  }
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${pnlClass(status.pnlDirection)} bg-white/80`}
        >
          {pnlLabel(status.pnlDirection)}
          {status.unrealizedPnlTotal != null ? ` · ${formatUsd(status.unrealizedPnlTotal)}` : ""}
        </span>
        {status.sellOrderId ? (
          <span className="text-[10px] text-slate-600">
            Venta: {status.sellOrderStatus ?? "—"}
            {status.distanceToLimit != null
              ? ` · ${status.distanceToLimit >= 0 ? "faltan" : "sobre"} ${formatUsd(Math.abs(status.distanceToLimit))} al limit`
              : ""}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] tabular-nums">
        <div className="rounded-md bg-white/80 border border-slate-200 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Spot</p>
          <p className="font-semibold text-investep-navy">{formatUsd(status.spotPrice)}</p>
        </div>
        <div className="rounded-md bg-white/80 border border-slate-200 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Strike</p>
          <p className="font-semibold text-investep-navy">{formatUsd(status.strikePrice)}</p>
        </div>
        <div className="rounded-md bg-white/80 border border-slate-200 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Opción</p>
          <p className="font-semibold text-investep-navy">{formatUsd(status.currentPrice)}</p>
        </div>
        <div className="rounded-md bg-white/80 border border-slate-200 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Entrada</p>
          <p className="font-semibold text-investep-navy">{formatUsd(status.entryPrice)}</p>
        </div>
        <div className="rounded-md bg-white/80 border border-slate-200 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Limit</p>
          <p className="font-semibold text-investep-navy">{formatUsd(status.limitSellPrice)}</p>
        </div>
        <div className="rounded-md bg-white/80 border border-slate-200 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Bid / Ask</p>
          <p className="font-semibold text-investep-navy">
            {formatUsd(status.currentBid)} / {formatUsd(status.currentAsk)}
          </p>
        </div>
        <div className="rounded-md bg-white/80 border border-slate-200 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wide text-slate-500">P/L c/u</p>
          <p className={`font-semibold ${pnlClass(status.pnlDirection)}`}>
            {formatUsd(status.unrealizedPnlPerShare)}
          </p>
        </div>
        <div className="rounded-md bg-white/80 border border-slate-200 px-2 py-1.5 min-w-0">
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Contrato</p>
          <p className="font-semibold text-investep-navy truncate" title={status.optionSymbol ?? undefined}>
            {status.optionSymbol ?? status.symbol ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

type Props = {
  row: FinanceAiBolinger15FastMovementTicker;
};

export function Mov15mExecutePanel({ row }: Props) {
  const predictedDir = resolveBb15PredictedDirection(row);
  const optionType: "CALL" | "PUT" =
    predictedDir.direction === "down" ? "PUT" : "CALL";
  const symbol = row.symbol ?? "?";
  const spotFallback =
    row.checks?.price != null && Number.isFinite(row.checks.price)
      ? row.checks.price
      : undefined;
  const flat = !predictedDir.direction;

  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<FinanceAiTradingOrderSummary[]>([]);
  const [buyOrderId, setBuyOrderId] = useState<string | null>(null);
  const [fillPrice, setFillPrice] = useState<number | null>(null);
  const [bought, setBought] = useState(false);
  const [fillOrderId, setFillOrderId] = useState<string | null>(null);
  const [sellOrderId, setSellOrderId] = useState<string | null>(null);
  const [sellLimitPrice, setSellLimitPrice] = useState<number | null>(null);
  const [positionStatus, setPositionStatus] = useState<FinanceAiTradingPositionStatus | null>(null);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const hasOpenPosition = bought && fillPrice != null && buyOrderId != null;

  const loadOrders = useCallback(async () => {
    if (symbol === "?") return;
    setBusy((b) => (b === "refresh" ? b : "refresh"));
    const result = await fetchFinanceAiMov15mOrders(symbol);
    if (result.success && result.orders) {
      setOrders(result.orders);
      const synced = syncSessionFromOrders(result.orders);
      setBuyOrderId(synced.buyOrderId);
      setFillPrice(synced.fillPrice);
      setBought(synced.bought);
      setSellOrderId(synced.sellOrderId);
      setSellLimitPrice(synced.sellLimitPrice);
      if (synced.fillPollOrderId) setFillOrderId(synced.fillPollOrderId);
    }
    setBusy((b) => (b === "refresh" ? null : b));
  }, [symbol]);

  useEffect(() => {
    if (!fillOrderId) return;
    let cancelled = false;
    const poll = async () => {
      const result = await fetchFinanceAiMov15mOrderFill(fillOrderId);
      if (cancelled || !result.success || !result.fill) return;
      if (result.fill.bought && result.fill.fillPrice != null) {
        setFillPrice(result.fill.fillPrice);
        setBought(true);
        setSellLimitPrice(calc10(result.fill.fillPrice));
        setFillOrderId(null);
        setMessage(`Filled @ ${formatUsd(result.fill.fillPrice)}`);
        void loadOrders();
        return;
      }
      if (!result.fill.fillPollActive) setFillOrderId(null);
    };
    void poll();
    const id = window.setInterval(() => void poll(), FILL_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [fillOrderId, loadOrders]);

  const handleCheckStatus = useCallback(async () => {
    if (!buyOrderId) return;
    setBusy("status");
    setMessage(null);
    const result = await fetchFinanceAiMov15mOrderStatus(buyOrderId, {
      sellOrderId: sellOrderId ?? undefined,
      spotPrice: spotFallback,
    });
    if (!result.success || !result.status) {
      setMessage(result.error ?? "Status failed");
      setPositionStatus(null);
    } else {
      setPositionStatus(result.status);
    }
    setBusy(null);
  }, [buyOrderId, sellOrderId, spotFallback]);

  const handleOrder = useCallback(
    async (side: "buy" | "sell" | "force_sell") => {
      if (symbol === "?") return;
      if ((side === "sell" || side === "force_sell") && !hasOpenPosition) {
        setMessage("Compra primero y espera el precio de ejecución.");
        return;
      }
      setBusy(side);
      setMessage(null);
      if (side === "buy") {
        setBought(false);
        setFillPrice(null);
        setBuyOrderId(null);
        setSellLimitPrice(null);
        setSellOrderId(null);
        setPositionStatus(null);
        setFillOrderId(null);
      }
      const result = await submitFinanceAiMov15mTradingOrder({
        symbol,
        side,
        optionType,
        direction: predictedDir.direction ?? undefined,
        buyOrderId:
          side === "sell" || side === "force_sell" ? buyOrderId ?? undefined : undefined,
      });
      if (!result.success) {
        setMessage(result.error ?? "Order failed");
        setBusy(null);
        return;
      }
      if (side === "buy" && result.result?.orderId) {
        setBuyOrderId(result.result.orderId);
        if (result.result.bought && result.result.fillPrice != null) {
          setFillPrice(result.result.fillPrice);
          setBought(true);
          setSellLimitPrice(calc10(result.result.fillPrice));
          setMessage(`Compra @ ${formatUsd(result.result.fillPrice)}`);
        } else if (result.result.fillPollActive) {
          setFillOrderId(result.result.orderId);
          setMessage("Esperando precio de ejecución…");
        } else {
          setMessage(result.result.message ?? "Compra enviada");
        }
      } else if (side === "sell" && result.result) {
        if (result.result.orderId) setSellOrderId(result.result.orderId);
        if (result.result.limitPrice != null) setSellLimitPrice(result.result.limitPrice);
        setMessage(`Limit sell @ ${formatUsd(result.result.limitPrice)}`);
      } else if (side === "force_sell" && result.result) {
        if (result.result.orderId) setSellOrderId(result.result.orderId);
        const n = result.result.cancelledLimitOrders?.length ?? 0;
        setMessage(
          n > 0
            ? `Force sell: ${n} limit cancelada(s) · MARKET+DAY enviado`
            : result.result.message ?? "Force sell MARKET+DAY enviado"
        );
        setPositionStatus(null);
      }
      await loadOrders();
      setBusy(null);
    },
    [buyOrderId, hasOpenPosition, loadOrders, optionType, predictedDir.direction, symbol]
  );

  const handleCancel = useCallback(
    async (orderId: string) => {
      setBusy(`cancel-${orderId}`);
      setMessage(null);
      const result = await cancelFinanceAiMov15mOrder(orderId);
      if (!result.success) {
        setMessage(result.error ?? "Error al cancelar");
      } else {
        setMessage(result.order?.message ?? "Orden cancelada");
        if (orderId === sellOrderId) setSellOrderId(null);
      }
      await loadOrders();
      setBusy(null);
    },
    [loadOrders, sellOrderId]
  );

  const handleSaveEdit = useCallback(
    async (orderId: string) => {
      const price = parseFloat(editPrice);
      if (!Number.isFinite(price) || price <= 0) {
        setMessage("Ingresa un precio limit válido.");
        return;
      }
      setBusy(`edit-${orderId}`);
      const result = await editFinanceAiMov15mOrderLimit(orderId, price);
      if (!result.success) {
        setMessage(result.error ?? "Update failed");
      } else {
        setMessage(`Limit actualizado a ${formatUsd(price)}`);
        setEditOrderId(null);
        setEditPrice("");
      }
      await loadOrders();
      setBusy(null);
    },
    [editPrice, loadOrders]
  );

  const workingCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.cancellable &&
          o.status !== "cancelled" &&
          o.status !== "bought" &&
          o.status !== "filled"
      ).length,
    [orders]
  );

  const targetLimit = sellLimitPrice ?? (fillPrice != null ? calc10(fillPrice) : null);

  return (
    <div className="mt-2 rounded-lg border border-investep-navy/15 overflow-hidden shadow-sm">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-investep-navy to-slate-800 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-investep-gold">
            Ejecutar
          </span>
          <span className="text-xs font-mono text-white/90">{optionType}</span>
          {hasOpenPosition && (
            <span className="text-[10px] text-emerald-300 font-medium">
              @ {formatUsd(fillPrice)}
            </span>
          )}
          {workingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
              {workingCount} activa{workingCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <span className="text-[10px] text-white/70 shrink-0">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="p-3 space-y-3 bg-gradient-to-b from-slate-50 to-white">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            <button
              type="button"
              disabled={busy !== null || flat}
              onClick={() => void handleOrder("buy")}
              className="text-[11px] font-medium px-2 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {busy === "buy" ? "…" : "Comprar"}
            </button>
            <button
              type="button"
              disabled={busy !== null || flat || !hasOpenPosition}
              onClick={() => void handleOrder("sell")}
              className="text-[11px] font-medium px-2 py-2 rounded-md bg-white border border-red-300 text-red-800 hover:bg-red-50 disabled:opacity-40"
              title={targetLimit ? `Limit @ ${formatUsd(targetLimit)}` : undefined}
            >
              {busy === "sell" ? "…" : targetLimit ? `Limit ${formatUsd(targetLimit)}` : "Limit Sell"}
            </button>
            <button
              type="button"
              disabled={busy !== null || flat || !hasOpenPosition}
              onClick={() => void handleOrder("force_sell")}
              className="text-[11px] font-medium px-2 py-2 rounded-md bg-red-700 text-white hover:bg-red-800 disabled:opacity-40"
            >
              {busy === "force_sell" ? "…" : "Force Sell"}
            </button>
            <button
              type="button"
              disabled={busy !== null || !hasOpenPosition}
              onClick={() => void handleCheckStatus()}
              className="text-[11px] font-medium px-2 py-2 rounded-md bg-white border border-sky-400 text-sky-900 hover:bg-sky-50 disabled:opacity-40"
            >
              {busy === "status" ? "…" : "Status"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void loadOrders()}
              className="text-[11px] font-medium px-2 py-2 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {busy === "refresh" ? "…" : "Actualizar"}
            </button>
          </div>

          {message && (
            <p className="text-[11px] text-slate-700 bg-slate-100 border border-slate-200 rounded px-2 py-1">
              {message}
            </p>
          )}
          {fillOrderId && !bought && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Esperando fill de compra…
            </p>
          )}

          {positionStatus && <PositionStatusBlock status={positionStatus} />}

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-2 py-1.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Órdenes · {symbol}
              </span>
              <span className="text-[10px] text-slate-500">{orders.length} hoy</span>
            </div>
            {orders.length === 0 ? (
              <p className="text-xs text-slate-500 px-3 py-4 text-center">Sin órdenes hoy</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-[9px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                      <th className="py-1.5 px-2 font-medium">Hora</th>
                      <th className="py-1.5 px-2 font-medium">Lado</th>
                      <th className="py-1.5 px-2 font-medium">Tipo</th>
                      <th className="py-1.5 px-2 font-medium">Precio</th>
                      <th className="py-1.5 px-2 font-medium">Fill</th>
                      <th className="py-1.5 px-2 font-medium">Estado</th>
                      <th className="py-1.5 px-2 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const oid = order.orderId ?? "";
                      const isEditing = editOrderId === oid;
                      const rowBusy =
                        busy === `cancel-${oid}` || busy === `edit-${oid}`;
                      const isSession =
                        oid === buyOrderId || oid === sellOrderId || order.buyOrderId === buyOrderId;
                      return (
                        <tr
                          key={oid}
                          className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/80 ${
                            isSession ? "bg-emerald-50/60" : ""
                          }`}
                        >
                          <td className="py-1.5 px-2 tabular-nums text-slate-600">
                            {formatTime(order.submittedAt)}
                          </td>
                          <td className="py-1.5 px-2 font-medium text-investep-navy">
                            {sideLabel(order.side)}
                          </td>
                          <td className="py-1.5 px-2 text-slate-600">{order.orderType ?? "—"}</td>
                          <td className="py-1.5 px-2 tabular-nums">
                            {formatUsd(order.limitPrice ?? order.price)}
                          </td>
                          <td className="py-1.5 px-2 tabular-nums text-emerald-800">
                            {formatUsd(order.fillPrice)}
                          </td>
                          <td className="py-1.5 px-2">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-medium ${statusTone(order.status)}`}
                            >
                              {statusLabel(order.status)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-16 text-[10px] border border-slate-300 rounded px-1 py-0.5"
                                />
                                <button
                                  type="button"
                                  disabled={rowBusy}
                                  onClick={() => void handleSaveEdit(oid)}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-sky-600 text-white"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditOrderId(null);
                                    setEditPrice("");
                                  }}
                                  className="text-[9px] px-1 py-0.5 text-slate-500"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                {order.editable && (
                                  <button
                                    type="button"
                                    disabled={busy !== null}
                                    onClick={() => {
                                      setEditOrderId(oid);
                                      setEditPrice(String(order.limitPrice ?? order.price ?? ""));
                                    }}
                                    className="text-[9px] px-1.5 py-0.5 rounded border border-sky-400 text-sky-800 hover:bg-sky-50"
                                  >
                                    Editar
                                  </button>
                                )}
                                {order.cancellable && (
                                  <button
                                    type="button"
                                    disabled={busy !== null}
                                    onClick={() => void handleCancel(oid)}
                                    className="text-[9px] px-1.5 py-0.5 rounded border border-red-400 text-red-800 hover:bg-red-50"
                                  >
                                    {rowBusy ? "…" : "Cancelar"}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
