import Link from "next/link";
import { FinanceAiSchedulesPanel } from "@/components/config/FinanceAiSchedulesPanel";
import { GlobalContextPanel } from "@/components/config/GlobalContextPanel";
import { NoTradingDaysPanel } from "@/components/config/NoTradingDaysPanel";
import { EvaluateStrategiesSettingsPanel } from "@/components/gestion/EvaluateStrategiesSettingsPanel";
import {
  fetchFinanceAiMarketCalendar,
  fetchFinanceAiPublishMeta,
} from "@/server/actions/finance-ai";
import { getFinanceAiScheduleSettings } from "@/server/actions/finance-ai-schedules";
import { listFavoriteSymbols, listBolinger15Symbols } from "@/server/actions/tickers";
import { listNoTradingDays } from "@/server/actions/no-trading-days";
import { isFinanceAiConfigured } from "@/server/services/finance-ai-client";

export default async function ConfigAwsPage() {
  const configured = isFinanceAiConfigured();
  let favoriteSymbols: string[] = [];
  let bolinger15Symbols: string[] = [];
  let initialSettings = null;
  let initialError: string | null = null;
  let dbError = false;
  let strategiesUpdatedAt: string | undefined;
  let frameworkUpdatedAt: string | undefined;
  let initialCalendar: Awaited<ReturnType<typeof fetchFinanceAiMarketCalendar>>["calendar"];
  let noTradingDays: Awaited<ReturnType<typeof listNoTradingDays>> = [];

  try {
    favoriteSymbols = await listFavoriteSymbols();
    bolinger15Symbols = await listBolinger15Symbols();
    noTradingDays = await listNoTradingDays();
  } catch {
    dbError = true;
  }

  if (configured && !dbError) {
    const [scheduleResult, publishMeta, calendarResult] = await Promise.all([
      getFinanceAiScheduleSettings(),
      fetchFinanceAiPublishMeta(),
      fetchFinanceAiMarketCalendar(),
    ]);
    if (scheduleResult.success && scheduleResult.settings) {
      initialSettings = scheduleResult.settings;
    } else if (scheduleResult.error) {
      initialError = scheduleResult.error;
    }
    strategiesUpdatedAt = publishMeta.strategies?.updatedAt;
    frameworkUpdatedAt = publishMeta.framework?.updatedAt;
    if (calendarResult.success && calendarResult.calendar) {
      initialCalendar = calendarResult.calendar;
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">FinanceAI — AWS</h1>
        <p className="text-sm text-gray-600 mt-1">
          Global Context, alertas estrategia, jobs programados AWS y watchlist PRE/POST. Rangos
          óptimos e intervalos NOW en{" "}
          <Link href="/config/tickers" className="text-investep-navy underline">
            Tickers
          </Link>
          .
        </p>
      </header>

      {dbError ? (
        <p className="text-sm text-red-700">Base de datos no disponible.</p>
      ) : (
        <div className="space-y-4">
          <NoTradingDaysPanel
            initialDays={noTradingDays}
            financeAiConfigured={configured}
          />
          <GlobalContextPanel
            configured={configured}
            strategiesUpdatedAt={strategiesUpdatedAt}
            frameworkUpdatedAt={frameworkUpdatedAt}
            initialCalendar={initialCalendar}
          />
          <EvaluateStrategiesSettingsPanel configured={configured} />
          <FinanceAiSchedulesPanel
            configured={configured}
            favoriteSymbols={favoriteSymbols}
            bolinger15Symbols={bolinger15Symbols}
            initialSettings={initialSettings}
            initialError={initialError}
          />
        </div>
      )}
    </div>
  );
}
