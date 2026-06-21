"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FinanceAiMov15mStatus } from "@/lib/finance-ai-types";
import {
  isBolinger15FastResultsPollEt,
  isBolinger15FastWindowEt,
} from "@/lib/live-session-window";
import { loadPersistedMov15mStatus } from "@/server/actions/mov15m-snapshot";
import { fetchFinanceAiMov15mStatus } from "@/server/actions/finance-ai";

const MOV15M_POLL_MS = 30_000;
const MOV15M_WINDOW_CHECK_MS = 15_000;

export function useMov15mWindowActive() {
  const [active, setActive] = useState(() => isBolinger15FastWindowEt());

  useEffect(() => {
    const sync = () => setActive(isBolinger15FastWindowEt());
    sync();
    const id = window.setInterval(sync, MOV15M_WINDOW_CHECK_MS);
    return () => window.clearInterval(id);
  }, []);

  return active;
}

export function useMov15mResultsPollActive() {
  const [active, setActive] = useState(() => isBolinger15FastResultsPollEt());

  useEffect(() => {
    const sync = () => setActive(isBolinger15FastResultsPollEt());
    sync();
    const id = window.setInterval(sync, MOV15M_WINDOW_CHECK_MS);
    return () => window.clearInterval(id);
  }, []);

  return active;
}

export function useMov15mSession(
  refreshSignal: number,
  nowPollRefresh: number,
  enabled: boolean,
  pollActive: boolean,
  initialStatus?: FinanceAiMov15mStatus | null,
  /** When true, trust initialStatus from the server and skip MySQL reload on mount. */
  hydratedFromServer = false
) {
  const [loading, setLoading] = useState(!hydratedFromServer && initialStatus == null);
  const [status, setStatus] = useState<FinanceAiMov15mStatus | null>(
    initialStatus ?? null
  );
  const lastMysqlKeyRef = useRef("");
  const lastAwsKeyRef = useRef("");

  const loadFromMysql = useCallback(async () => {
    const result = await loadPersistedMov15mStatus();
    if (result.success && result.status) {
      setStatus(result.status);
    }
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const result = await fetchFinanceAiMov15mStatus({ persist: true });
    setLoading(false);
    if (result.success && result.status) {
      setStatus(result.status);
    }
  }, [enabled]);

  const applyStatus = useCallback((next: FinanceAiMov15mStatus) => {
    setStatus(next);
  }, []);

  useEffect(() => {
    if (hydratedFromServer) {
      setStatus(initialStatus ?? null);
      setLoading(false);
      return;
    }
    if (initialStatus) {
      setStatus(initialStatus);
      setLoading(false);
    } else {
      void loadFromMysql();
    }
  }, [hydratedFromServer, initialStatus, loadFromMysql]);

  useEffect(() => {
    if (!enabled || !pollActive) return;
    const id = window.setInterval(() => {
      void reload();
    }, MOV15M_POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, pollActive, reload, refreshSignal, nowPollRefresh]);

  return { loading, status, reload, applyStatus, lastMysqlKeyRef, lastAwsKeyRef };
}
