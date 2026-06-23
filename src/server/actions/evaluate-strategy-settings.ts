"use server";

import {
  attachShortCodes,
  EVALUATE_STRATEGY_IDS_SETTING_KEY,
  normalizeEvaluateStrategyIds,
  parseEvaluateStrategyIdsJson,
  type PlaybookCurrentEntry,
} from "@/lib/evaluate-strategy-ids";
import { MARKET_AI_EVALUABLE_STRATEGIES_FALLBACK } from "@/lib/market-ai-process-scope";
import { prisma } from "@/lib/db";
import {
  getScheduleSettings,
  isFinanceAiConfigured,
  type FinanceAiScheduleSettings,
} from "@/server/services/finance-ai-client";

export type EvaluateStrategySettingsSnapshot = {
  catalog: PlaybookCurrentEntry[];
  selected: string[];
  effective: string[];
  configuredInMysql: boolean;
  configuredInAws: boolean;
};

function catalogFromScheduleSettings(
  settings: FinanceAiScheduleSettings | undefined
): PlaybookCurrentEntry[] {
  const fromAws = settings?.playbookCurrent
    ?.map((row) => ({
      id: String(row?.id ?? "").trim(),
      title: String(row?.title ?? row?.id ?? "").trim(),
    }))
    .filter((row): row is PlaybookCurrentEntry => Boolean(row.id));
  if (fromAws?.length) return attachShortCodes(fromAws);
  return attachShortCodes(MARKET_AI_EVALUABLE_STRATEGIES_FALLBACK);
}

async function loadEvaluateStrategyIdsFromMysql(): Promise<string[] | null> {
  const row = await prisma.generalSetting.findUnique({
    where: { key: EVALUATE_STRATEGY_IDS_SETTING_KEY },
  });
  return parseEvaluateStrategyIdsJson(row?.value);
}

export async function saveEvaluateStrategyIdsToMysql(strategyIds: string[]): Promise<void> {
  const value = JSON.stringify(strategyIds);
  await prisma.generalSetting.upsert({
    where: { key: EVALUATE_STRATEGY_IDS_SETTING_KEY },
    create: { key: EVALUATE_STRATEGY_IDS_SETTING_KEY, value },
    update: { value },
  });
}

function effectiveFromAws(settings: FinanceAiScheduleSettings | undefined): string[] {
  if (settings?.evaluateStrategyIdsEffective?.length) {
    return settings.evaluateStrategyIdsEffective;
  }
  if (settings?.evaluateStrategyIds?.length) {
    return settings.evaluateStrategyIds;
  }
  const catalogIds = catalogFromScheduleSettings(settings).map((row) => row.id);
  return catalogIds.length ? [catalogIds[0]] : ["estrategia-01"];
}

export async function getEvaluateStrategySettings(): Promise<EvaluateStrategySettingsSnapshot> {
  const schedules = isFinanceAiConfigured() ? await getScheduleSettings() : null;
  const settings = schedules?.ok ? schedules.data : undefined;
  const catalog = catalogFromScheduleSettings(settings);
  const catalogIds = catalog.map((row) => row.id);

  const mysqlIds = await loadEvaluateStrategyIdsFromMysql();
  const mysqlNormalized = mysqlIds
    ? normalizeEvaluateStrategyIds(mysqlIds, catalogIds)
    : [];

  const awsStored = settings?.evaluateStrategyIds ?? null;
  const effective =
    mysqlNormalized.length > 0
      ? mysqlNormalized
      : normalizeEvaluateStrategyIds(effectiveFromAws(settings), catalogIds);

  const selected =
    mysqlNormalized.length > 0
      ? mysqlNormalized
      : awsStored?.length
        ? normalizeEvaluateStrategyIds(awsStored, catalogIds)
        : effective;

  return {
    catalog,
    selected,
    effective,
    configuredInMysql: mysqlNormalized.length > 0,
    configuredInAws: Boolean(awsStored?.length),
  };
}

/** Strategy ids for POST /tickers/check — MySQL first, validated against AWS playbook-current. */
export async function getConfiguredEvaluateStrategyIdsFromStore(): Promise<string[]> {
  const snapshot = await getEvaluateStrategySettings();
  return snapshot.effective;
}
