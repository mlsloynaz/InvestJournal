"use server";

import { revalidatePath } from "next/cache";
import { InvestmentPlanMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatSymbol } from "@/lib/utils";
import {
  buildReportByTicker,
  buildReportByWeekAndTicker,
  decimalToNumber,
  groupEntriesByMonth,
  parseAccountParam,
  parseModeParam,
  PLAN_MODE_RATE,
  round2,
  suggestedInvest,
  suggestedRentabilidad,
  sumRentabilidad,
  todayIsoDate,
  weekOfMonthFromDate,
  yearMonthFromDate,
  type InvestmentPlanModeKey,
  type PlanAccountKey,
  type PlanEntryView,
} from "@/lib/investment-plan";

const PAGE_PATH = "/tools/plan-inversion";

function revalidatePlan() {
  revalidatePath(PAGE_PATH);
}

function toPrismaMode(mode: InvestmentPlanModeKey): InvestmentPlanMode {
  return mode === "P35" ? InvestmentPlanMode.P35 : InvestmentPlanMode.P10;
}

function accountToPractice(account: PlanAccountKey): boolean {
  return account === "practice";
}

async function getOrCreateConfig() {
  return prisma.investmentPlanConfig.upsert({
    where: { id: 1 },
    create: { id: 1, dailyInvestPercent: 10 },
    update: {},
  });
}

async function getTrackInitial(mode: InvestmentPlanModeKey, isPractice: boolean) {
  const prismaMode = toPrismaMode(mode);
  return prisma.investmentPlanTrackInitial.findUnique({
    where: { mode_isPractice: { mode: prismaMode, isPractice } },
  });
}

async function getPriorCapital(
  mode: InvestmentPlanModeKey,
  isPractice: boolean,
  beforeDate?: Date
): Promise<number | null> {
  const prismaMode = toPrismaMode(mode);

  const where = {
    mode: prismaMode,
    isPractice,
    ...(beforeDate ? { entryDate: { lte: beforeDate } } : {}),
  };

  const last = await prisma.investmentPlanEntry.findFirst({
    where,
    orderBy: [{ entryDate: "desc" }, { id: "desc" }],
  });

  if (last) return decimalToNumber(last.capital);

  const track = await getTrackInitial(mode, isPractice);
  if (track) return decimalToNumber(track.initialCapital);
  return null;
}

function mapEntry(e: {
  id: number;
  entryDate: Date;
  yearMonth: string;
  weekOfMonth: number;
  ticker: string | null;
  isPractice: boolean;
  investAmount: { toString(): string };
  rentabilidad: { toString(): string };
  capital: { toString(): string };
}): PlanEntryView {
  return {
    id: e.id,
    entryDate: e.entryDate.toISOString().slice(0, 10),
    yearMonth: e.yearMonth,
    weekOfMonth: e.weekOfMonth,
    ticker: e.ticker,
    isPractice: e.isPractice,
    investAmount: decimalToNumber(e.investAmount),
    rentabilidad: decimalToNumber(e.rentabilidad),
    capital: decimalToNumber(e.capital),
  };
}

export async function getInvestmentPlanPageData(modeParam?: string, accountParam?: string) {
  const mode = parseModeParam(modeParam);
  const account = parseAccountParam(accountParam);
  const isPractice = accountToPractice(account);
  const config = await getOrCreateConfig();
  const prismaMode = toPrismaMode(mode);
  const today = todayIsoDate();

  const [entries, realEntries, tickers, trackInitial] = await Promise.all([
    prisma.investmentPlanEntry.findMany({
      where: { mode: prismaMode, isPractice },
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    }),
    prisma.investmentPlanEntry.findMany({
      where: {
        mode: prismaMode,
        isPractice: false,
        entryDate: { lte: new Date(today + "T23:59:59.000Z") },
      },
      orderBy: [{ entryDate: "asc" }, { id: "asc" }],
    }),
    prisma.ticker.findMany({ orderBy: { symbol: "asc" }, select: { symbol: true } }),
    getTrackInitial(mode, isPractice),
  ]);

  const mapped = entries.map(mapEntry);
  const months = groupEntriesByMonth(mapped);
  const reportEntries = mapped.slice().sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  const priorCapital = await getPriorCapital(mode, isPractice);
  const dailyInvestPercent = decimalToNumber(config.dailyInvestPercent);
  const suggested =
    priorCapital != null
      ? {
          investAmount: suggestedInvest(priorCapital, dailyInvestPercent),
          rentabilidad: suggestedRentabilidad(
            suggestedInvest(priorCapital, dailyInvestPercent),
            PLAN_MODE_RATE[mode]
          ),
        }
      : null;

  const realMapped = realEntries.map(mapEntry);
  const totalRealEarnings = sumRentabilidad(realMapped, today);

  return {
    mode,
    account,
    trackInitial: trackInitial
      ? {
          initialCapital: decimalToNumber(trackInitial.initialCapital),
          setAt: trackInitial.setAt.toISOString().slice(0, 10),
        }
      : null,
    hasTrackInitial: trackInitial != null,
    config: {
      dailyInvestPercent,
    },
    months,
    priorCapital,
    suggested,
    tickers: tickers.map((t) => t.symbol),
    report: {
      byWeek: buildReportByWeekAndTicker(reportEntries),
      byTicker: buildReportByTicker(reportEntries),
      totalRentabilidad: sumRentabilidad(reportEntries, today),
    },
    totalRealEarnings,
    today,
  };
}

export async function setTrackInitialCapital(formData: FormData): Promise<void> {
  const mode = parseModeParam(String(formData.get("mode") ?? ""));
  const account = parseAccountParam(String(formData.get("account") ?? ""));
  const isPractice = accountToPractice(account);
  const initialCapital = parseFloat(String(formData.get("initialCapital") ?? ""));

  if (!Number.isFinite(initialCapital) || initialCapital <= 0) return;

  const prismaMode = toPrismaMode(mode);
  const existing = await getTrackInitial(mode, isPractice);
  if (existing) return;

  await prisma.investmentPlanTrackInitial.create({
    data: {
      mode: prismaMode,
      isPractice,
      initialCapital: round2(initialCapital),
    },
  });

  revalidatePlan();
}

export async function updateInvestmentPlanConfig(formData: FormData): Promise<void> {
  const dailyInvestPercent = parseFloat(String(formData.get("dailyInvestPercent") ?? ""));

  if (!Number.isFinite(dailyInvestPercent) || dailyInvestPercent <= 0 || dailyInvestPercent > 100) {
    return;
  }

  await prisma.investmentPlanConfig.upsert({
    where: { id: 1 },
    create: { id: 1, dailyInvestPercent },
    update: { dailyInvestPercent },
  });

  revalidatePlan();
}

export async function addInvestmentPlanEntry(formData: FormData): Promise<void> {
  const mode = parseModeParam(String(formData.get("mode") ?? ""));
  const account = parseAccountParam(String(formData.get("account") ?? ""));
  const entryAccount = String(formData.get("entryAccount") ?? account);
  const isPractice = entryAccount === "practice";

  const dateRaw = String(formData.get("entryDate") ?? "");
  const investAmount = parseFloat(String(formData.get("investAmount") ?? ""));
  const rentabilidad = parseFloat(String(formData.get("rentabilidad") ?? ""));

  const tickerRaw = String(formData.get("ticker") ?? "").trim();
  const ticker = tickerRaw ? formatSymbol(tickerRaw) : null;

  if (!dateRaw) return;
  if (!Number.isFinite(investAmount) || investAmount < 0) return;
  if (!Number.isFinite(rentabilidad)) return;

  const prismaMode = toPrismaMode(mode);
  const track = await getTrackInitial(mode, isPractice);
  if (!track) return;

  const entryDate = new Date(dateRaw + "T00:00:00.000Z");
  const yearMonth = yearMonthFromDate(entryDate);
  const weekOfMonth = weekOfMonthFromDate(entryDate);

  const priorCapital = await getPriorCapital(mode, isPractice, entryDate);
  if (priorCapital == null) return;

  const capital = round2(priorCapital + rentabilidad);

  await prisma.investmentPlanEntry.create({
    data: {
      mode: prismaMode,
      entryDate,
      yearMonth,
      weekOfMonth,
      ticker,
      isPractice,
      investAmount: round2(investAmount),
      rentabilidad: round2(rentabilidad),
      capital,
    },
  });

  revalidatePlan();
}

export async function deleteInvestmentPlanEntry(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await prisma.investmentPlanEntry.delete({ where: { id } });
  revalidatePlan();
}
