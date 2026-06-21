export type FinanceAiPublishResponse = {
  success: boolean;
  contextType?: string;
  filename?: string;
  updatedAt?: string;
  contentLength?: number;
  playbooksCount?: number;
  playbooksVersion?: number;
  error?: string;
};

export type FinanceAiMarketSnapshot = {
  D?: { close?: number; ma_stack?: string; bollinger?: { position?: string } };
  "1h"?: { close?: number; ma_stack?: string; bollinger?: { position?: string } };
  "15m"?: { close?: number; ma_stack?: string; bollinger?: { position?: string } };
};

export type FinanceAiTimeframeTrend = {
  direction?: "bullish" | "bearish" | "lateral" | "unknown" | string;
  maStack?: string;
  bbMidSlope?: string;
  evidence?: string;
};

export type FinanceAiMarketFoundation = {
  ready?: boolean;
  reason?: string;
  trends?: {
    D?: FinanceAiTimeframeTrend;
    "1h"?: FinanceAiTimeframeTrend;
    "15m"?: FinanceAiTimeframeTrend;
  };
  trendline1h?: {
    direction?: string;
    linePriceNow?: number;
    priceVsLine?: string;
    lineValid?: boolean;
  };
  barsUsed?: { daily?: number; hourly?: number; min15?: number };
  panoramaCompleto?: FinanceAiPanoramaCompleto;
};

export type FinanceAiPanoramaTf = {
  timeframe?: string;
  available?: boolean;
  close?: number;
  trend?: {
    direction?: string;
    maStack?: string;
    bbMidSlope?: string;
    bbTrend?: string;
  };
  bollinger?: {
    upper?: number;
    middle?: number;
    lower?: number;
    position?: string;
    widthPct?: number;
    volState?: string;
  };
  maRoles?: {
    period?: number;
    value?: number;
    role?: string;
    distancePct?: number;
    onLine?: boolean;
  }[];
  nearestSupport?: number;
  nearestResistance?: number;
  nearSupport?: boolean;
  nearResistance?: boolean;
  fakeVolatility?: boolean;
  fakeMovement?: boolean;
};

export type FinanceAiPanoramaCompleto = {
  ready?: boolean;
  phase?: string;
  evaluatedAt?: string;
  reason?: string;
  timeframes?: {
    D?: FinanceAiPanoramaTf;
    "1h"?: FinanceAiPanoramaTf;
    "15m"?: FinanceAiPanoramaTf;
  };
  structural?: {
    ath?: number;
    yearHigh?: number;
    yearLow?: number;
    support?: number[];
    resistance?: number[];
    gapPct?: number;
    gapDirection?: string;
  };
  trendline1h?: FinanceAiMarketFoundation["trendline1h"];
  flags?: {
    id?: string;
    severity?: string;
    timeframe?: string;
    message?: string;
  }[];
  strategyHints?: {
    kind?: string;
    impact?: string;
    message?: string;
    affectedDirections?: string[];
  }[];
  edgeLines?: {
    available?: boolean;
    referencePrice?: number;
    hourly?: {
      nearestHighs?: number[];
      nearestLows?: number[];
    };
    daily?: {
      nearestHighs?: number[];
      nearestLows?: number[];
    };
    historical?: {
      ath?: number;
      yearHigh?: number;
      yearLow?: number;
    };
  };
  summaryLines?: string[];
};

export type FinanceAiPanoramaDiff = {
  available?: boolean;
  trendChanges?: string[];
  summaryLines?: string[];
};

export type FinanceAiHistoricalData = {
  dailyThrough?: string;
  hourlyThrough?: string;
  min15Through?: string;
  lastBarAt?: string;
};

export type FinanceAiNewsSentiment = {
  averageScore?: number;
  count?: number;
  skipped?: boolean;
  skipReason?: string;
  headlines?: {
    title?: string;
    published?: string;
    sentiment_label?: string;
    sentiment_score?: number;
  }[];
  symbol?: string;
  tradeDate?: string;
  fetchedAt?: string;
  source?: string;
  scheduledSlot?: string;
  freshForToday?: boolean;
  items?: {
    title?: string;
    published?: string;
    sentiment_label?: string;
    sentiment_score?: number;
    summary?: string;
    source?: string;
  }[];
};

export type FinanceAiTickerContext = {
  symbol: string;
  status: "ready" | "initializing" | "error" | string;
  updatedAt?: string;
  historicalData?: FinanceAiHistoricalData;
  marketSnapshot?: FinanceAiMarketSnapshot;
  structuralLevels?: {
    ath?: number;
    yearHigh?: number;
    yearLow?: number;
    gap_pct?: number;
    gap_direction?: string | null;
  };
  newsSentiment?: FinanceAiNewsSentiment;
  error?: string;
};

export type FinanceAiGlobalContext = {
  contextType: string;
  content: string;
  updatedAt?: string;
  source?: string;
  filename?: string;
};

export type FinanceAiPremarketMovement = {
  scenario?: string;
  probability?: string;
  description?: string;
};

export type FinanceAiStrategyCandidate = {
  id?: string;
  direction?: "CALL" | "PUT" | "none" | string;
  fit?: string;
  notes?: string;
  waitForConfirmation?: string[];
  probableWait?: boolean;
  waitReason?: string;
  profitProfile?: "10pct" | "35pct" | "none" | string;
  profitProfileReason?: string;
  gapFirst5Min?: boolean;
  noton?: string | null;
};

export type FinanceAiTradePlan = {
  primaryStrategyId?: string | null;
  direction?: "CALL" | "PUT" | "none" | string;
  fit?: string;
  waitForConfirmation?: string[];
  probableWait?: boolean;
  waitReason?: string;
  profitProfile?: "10pct" | "35pct" | "none" | string;
  profitProfileReason?: string;
  gapFirst5Min?: boolean;
  noton?: string | null;
};

export type FinanceAiPredictionSupport = {
  supported?: boolean;
  summary?: string;
  unsupportedPoints?: string[];
};

export type FinanceAiStrategyCheckItem = {
  requirementId?: string;
  label?: string;
  ruleKey?: string;
  timeframe?: string;
  automatable?: string;
  classification?: "mandatory" | "support" | "execution";
  supportBonusPct?: number;
  status?: "met" | "not_met" | "partial" | "unknown" | "manual";
  evidence?: string;
};

export type FinanceAiStrategyRequirementSpec = {
  ruleKey: string;
  timeframe?: string;
  label?: string;
  strategyId?: string;
  variantId?: string;
  requirementId?: string;
  automatable?: string;
  checkId?: string;
};

/** Isolated rule spec for POST /rules/check (alias of strategy requirement). */
export type FinanceAiRuleSpec = FinanceAiStrategyRequirementSpec;

export type FinanceAiStrategyRequirementTickerResult = {
  symbol: string;
  success: boolean;
  passed?: boolean;
  status?: FinanceAiStrategyCheckItem["status"];
  error?: string;
  requirement?: FinanceAiStrategyRequirementSpec & {
    strategyId?: string;
    variantId?: string | null;
  };
  check?: FinanceAiStrategyCheckItem;
  contextSource?: string;
  assessmentPhase?: string;
  tradeDate?: string;
  evaluatedAt?: string;
};

export type FinanceAiStrategyRequirementBatchResponse = {
  success: boolean;
  mode?: string;
  requirement?: FinanceAiStrategyRequirementSpec;
  fresh?: boolean;
  summary?: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
  };
  results: FinanceAiStrategyRequirementTickerResult[];
  errors?: string[] | null;
  evaluatedAt?: string;
  error?: string;
};

/** Response from POST /rules/check. */
export type FinanceAiRulesCheckResponse = FinanceAiStrategyRequirementBatchResponse;

export type FinanceAiStrategyProbabilityBasis = {
  scorableRequirements?: number;
  mandatoryRequirements?: number;
  supportRequirements?: number;
  mandatoryPct?: number;
  supportBonusPct?: number;
  supportMetCount?: number;
  met?: number;
  partial?: number;
  notMet?: number;
  note?: string;
};

export type FinanceAiStrategyFit = {
  strategyId?: string;
  strategyTitle?: string;
  variantId?: string | null;
  variantName?: string | null;
  direction?: string;
  fit?: "high" | "medium" | "low" | "none";
  probabilityPct?: number;
  timingOrder?: number;
  expectedTiming?: string;
  probabilityBasis?: FinanceAiStrategyProbabilityBasis;
  summary?: {
    met?: number;
    partial?: number;
    notMet?: number;
    manual?: number;
    unknown?: number;
    total?: number;
  };
  checklist?: FinanceAiStrategyCheckItem[];
  /** Some API responses use `requirements` instead of `checklist`. */
  requirements?: FinanceAiStrategyCheckItem[];
  entryRequirements?: string[];
  panoramaAdjusted?: boolean;
  panoramaNotes?: string[];
  openingWindowExpired?: boolean;
  openingWindowMissed?: boolean;
  expiredReason?: string;
};

export type FinanceAiFomcMeeting = {
  start?: string;
  end?: string;
  sep?: boolean;
};

export type FinanceAiMonthCalendar = {
  month?: string;
  from?: string;
  to?: string;
  updatedAt?: string;
  symbolEarnings?: { date?: string; hour?: string; symbol?: string }[];
  fomcDates?: { date?: string; event?: string; sep?: boolean }[];
  blockedDates?: { date?: string; reasons?: string[]; hardBlock?: boolean }[];
  earningsCount?: number;
  fomcCount?: number;
};

export type FinanceAiMarketCalendar = {
  month?: string;
  tradeDate?: string;
  monthCalendar?: FinanceAiMonthCalendar;
  hasEarningsToday?: boolean;
  hasFomcToday?: boolean;
  earningsToday?: { date?: string; hour?: string; symbol?: string }[];
  fomcToday?: { date?: string; event?: string }[];
};

export type FinanceAiSessionGap = {
  tradeDate?: string;
  priorClose?: number;
  referencePrice?: number;
  impliedGapPct?: number;
  structuralGapPct?: number;
  structuralGapDirection?: string | null;
  gapPredictors?: string[];
  postMarketYesterday?: {
    available?: boolean;
    movePct?: number;
    direction?: string;
    sessionDate?: string;
  };
  premarketToday?: {
    available?: boolean;
    movePct?: number;
    impliedGapPct?: number;
    direction?: string;
    premarketLast?: number;
  };
  maCuts?: {
    maPeriod?: number;
    maValue?: number;
    kind?: string;
    distancePct?: number;
  }[];
  trendlineCut?: {
    linePrice?: number;
    kind?: string;
    direction?: string;
  };
  gapBollinger?: FinanceAiGapBollingerOutlook;
};

export type FinanceAiGapBollingerTfOutlook = {
  timeframe?: string;
  available?: boolean;
  bbTrend?: string;
  bbMidSlope?: string;
  exposure?: string;
  setup?: string | null;
};

export type FinanceAiGapBollingerOutlook = {
  available?: boolean;
  priceKind?: "probable" | "real" | string;
  projectedPrice?: number;
  primarySetup?: string | null;
  strength?: "strong" | "moderate" | "weak" | "none" | string;
  strengthDetail?: string | null;
  timeframes?: {
    "15m"?: FinanceAiGapBollingerTfOutlook;
    "1h"?: FinanceAiGapBollingerTfOutlook;
    D?: FinanceAiGapBollingerTfOutlook;
  };
};

export type FinanceAiCalendarGateItem = {
  id?: string;
  label?: string;
  status?: "blocked" | "clear" | "unknown";
  evidence?: string;
};

export type FinanceAiCalendarGate = {
  doNotTrade?: boolean;
  doNotTradeReasons?: string[];
  checklist?: FinanceAiCalendarGateItem[];
  hasEarningsToday?: boolean;
  hasFomcToday?: boolean;
  tradeDate?: string;
  source?: string;
};

export type FinanceAiStrategyEvalDataWindow = {
  phase?: "PRE" | "NOW" | "POST" | string;
  tradeDate?: string;
  dataCutoffEt?: string;
  dailyThrough?: string | null;
  hourlyThrough?: string | null;
  min15Through?: string | null;
  evaluatedAt?: string | null;
};

export type FinanceAiStrategyChecklist = {
  ready?: boolean;
  trends?: FinanceAiMarketFoundation["trends"];
  trendline1h?: FinanceAiMarketFoundation["trendline1h"];
  panoramaCompleto?: FinanceAiPanoramaCompleto;
  sessionGap?: FinanceAiSessionGap;
  strategies?: FinanceAiStrategyFit[];
  calendarGate?: FinanceAiCalendarGate;
  evalDataWindow?: FinanceAiStrategyEvalDataWindow;
};

export type FinanceAiTickersNowStrategy = {
  strategyId?: string;
  variantId?: string | null;
  variantName?: string | null;
  direction?: string;
  fit?: FinanceAiStrategyFit["fit"];
  passPct?: number;
  probabilityPct?: number;
};

export type FinanceAiTickersNowEntry = {
  symbol: string;
  bestPassPct?: number;
  bestProbabilityPct?: number;
  bestStrategyId?: string;
  bestDirection?: string;
  strategies?: FinanceAiTickersNowStrategy[];
};

export type FinanceAiTickersNow = {
  tradeDate?: string;
  symbols?: string[];
  entries?: FinanceAiTickersNowEntry[];
  criteria?: string;
  minPassPct?: number;
  maxSymbols?: number;
  scope?: string;
  source?: string;
  updatedAt?: string;
};

export type FinanceAiTickersToday15M = FinanceAiTickersNow;

export type FinanceAiPremarketAnalysis = {
  success?: boolean;
  symbol?: string;
  date?: string;
  revision?: number;
  source?: string;
  assessmentPhase?: "PRE" | "NOW" | string;
  dataCutoffEt?: string;
  simulationTimeEt?: string;
  simulationTradeDate?: string;
  preBaseline?: Partial<FinanceAiPremarketAnalysis>;
  nowUpdatedAt?: string;
  mode?: string;
  updatedAt?: string;
  bias?: string;
  probabilities?: { bull?: number; base?: number; bear?: number };
  possibleMovements?: FinanceAiPremarketMovement[];
  strategyCandidates?: FinanceAiStrategyCandidate[];
  tradePlan?: FinanceAiTradePlan;
  predictionSupport?: FinanceAiPredictionSupport;
  keyLevels?: {
    support?: number[];
    resistance?: number[];
    gap_pct?: number | null;
  };
  risks?: string[];
  narrative?: string;
  doNotTrade?: boolean;
  doNotTradeReasons?: string[];
  delta?: Record<string, unknown>;
  status?: string;
  message?: string;
  error?: string;
  bedrockError?: string;
  strategyChecklist?: FinanceAiStrategyChecklist;
  marketFoundation?: FinanceAiMarketFoundation;
  panoramaCompleto?: FinanceAiPanoramaCompleto;
  calendarGate?: FinanceAiCalendarGate;
  bedrockSkipped?: boolean;
  marketCalendar?: FinanceAiMarketCalendar;
  sessionGap?: FinanceAiSessionGap;
  newsSentiment?: FinanceAiNewsSentiment;
  nowAiAssessment?: FinanceAiNowAiAssessment;
  /** false after persisted POST /check (bars + eval saved to Dynamo). */
  ephemeral?: boolean;
  persisted?: boolean;
  foundationNote?: string;
  preDisplayNote?: string;
  /** stored = existing TickerContext; fetched = built in memory for this check. */
  contextSource?: "stored" | "fetched" | string;
};

export type FinanceAiNowAiAssessment = {
  updatedAt?: string;
  source?: string;
  bedrockSkipped?: boolean;
  bedrockError?: string;
  eligibleStrategies?: {
    id?: string;
    name?: string;
    probabilityPct?: number;
  }[];
  analysis?: Pick<
    FinanceAiPremarketAnalysis,
    | "bias"
    | "probabilities"
    | "possibleMovements"
    | "strategyCandidates"
    | "tradePlan"
    | "narrative"
    | "risks"
    | "doNotTrade"
    | "doNotTradeReasons"
  >;
};

export type FinanceAiPostmarketStrategyOutcome = {
  strategyId?: string;
  variantId?: string;
  variantName?: string;
  direction?: string;
  morningFit?: string;
  eveningFit?: string;
  morningProbabilityPct?: number;
  eveningProbabilityPct?: number;
  achieved?: boolean;
  reasons?: string[];
};

export type FinanceAiPostmarketOutcomes = {
  sessionStats?: Record<string, unknown>;
  biasCorrect?: boolean;
  morningBias?: string;
  actualDayDirection?: string;
  primaryStrategyId?: string;
  primaryDirection?: string;
  primaryAchieved?: boolean;
  primaryOutcome?: FinanceAiPostmarketStrategyOutcome;
  strategyOutcomes?: FinanceAiPostmarketStrategyOutcome[];
  qualifiedCount?: number;
  achievedCount?: number;
  achievementPct?: number;
};

export type FinanceAiPostmarketEngineSuggestion = {
  suggestion?: string;
  priority?: "high" | "medium" | "low" | string;
  targetRuleOrStrategy?: string;
};

export type FinanceAiPostmarketReport = {
  summary?: string;
  primaryVerdict?: "achieved" | "partial" | "missed" | "not_applicable" | string;
  whyNotAchieved?: string[];
  missedConsiderations?: string[];
  suggestionsForEngine?: FinanceAiPostmarketEngineSuggestion[];
  whatWorked?: string[];
  lessonsForTomorrow?: string[];
  bedrockError?: string;
};

export type FinanceAiPostmarketEffectivenessSnapshot = {
  globalByStrategy?: Record<
    string,
    { attempts?: number; achieved?: number; achievementPct?: number }
  >;
  thisTicker?: {
    attempts?: number;
    achieved?: number;
    achievementPct?: number;
    byStrategy?: Record<
      string,
      { attempts?: number; achieved?: number; achievementPct?: number }
    >;
  };
  topSuggestions?: Array<{
    text?: string;
    priority?: string;
    targetRuleOrStrategy?: string;
    count?: number;
  }>;
  totalReports?: number;
};

export type FinanceAiPostmarketAnalysis = {
  success?: boolean;
  symbol?: string;
  date?: string;
  status?: string;
  source?: string;
  updatedAt?: string;
  premarketRevision?: number;
  outcomes?: FinanceAiPostmarketOutcomes;
  report?: FinanceAiPostmarketReport;
  effectivenessSnapshot?: FinanceAiPostmarketEffectivenessSnapshot;
  sessionGap?: FinanceAiSessionGap;
  panoramaMorning?: FinanceAiPanoramaCompleto;
  panoramaEvening?: FinanceAiPanoramaCompleto;
  panoramaDiff?: FinanceAiPanoramaDiff;
  bedrockError?: string;
  error?: string;
  message?: string;
};

export type FinanceAiPostmarketStats = {
  contextType?: string;
  updatedAt?: string;
  totalReports?: number;
  lastTradeDate?: string;
  lastSymbol?: string;
  byTicker?: Record<
    string,
    {
      attempts?: number;
      achieved?: number;
      achievementPct?: number;
      byStrategy?: Record<
        string,
        { attempts?: number; achieved?: number; achievementPct?: number }
      >;
    }
  >;
  byStrategy?: Record<
    string,
    { attempts?: number; achieved?: number; achievementPct?: number }
  >;
  suggestions?: Array<{
    text?: string;
    priority?: string;
    targetRuleOrStrategy?: string;
    count?: number;
    firstSeen?: string;
    lastSeen?: string;
  }>;
};

export type FinanceAiNowPollingStatus = {
  tradeDate?: string;
  updatedAt?: string;
  lastSessionPollAt?: string;
  minutesEt?: number;
  sessionOpen?: boolean;
  pollingWindowActive?: boolean;
  pollIntervalMin?: number | null;
  pollPhase?: string | null;
  activeProfiles?: Array<{ id?: string; label?: string }>;
  scheduledSymbols?: string[];
  profiles?: Record<
    string,
    {
      lastRunAt?: string;
      symbolCount?: number;
      successCount?: number;
      symbols?: string[];
      intervalMin?: number;
      label?: string;
    }
  >;
  tickers?: Record<
    string,
    {
      lastProfile?: string;
      lastRunAt?: string;
      lastSuccess?: boolean;
      lastError?: string;
      manualNow?: boolean;
      scheduled?: boolean;
      scheduleStopped?: boolean;
      lastSummary?: { qualifiedCount?: number; metTotal?: number; reqTotal?: number };
    }
  >;
  recentRuns?: Array<{
    at?: string;
    profile?: string;
    symbols?: string[];
    successCount?: number;
    total?: number;
  }>;
  manualEnrolled?: string[];
  profileLabels?: Record<string, string>;
};

export type FinanceAiStrategyAlert = {
  symbol?: string;
  alertId?: string;
  type?: string;
  tradeDate?: string;
  strategyId?: string;
  variantId?: string;
  strategyName?: string;
  direction?: string;
  fit?: string;
  probabilityPct?: number;
  price?: number;
  profile?: string;
  minutesEt?: number;
  requirementsMet?: number;
  requirementsTotal?: number;
  createdAt?: string;
  message?: string;
};

export type FinanceAiAlertsSettings = {
  alertsEnabled?: boolean;
  updatedAt?: string | null;
  success?: boolean;
};

export type FinanceAiRecentAlertsStatus = {
  tradeDate?: string;
  updatedAt?: string;
  alertsEnabled?: boolean;
  count?: number;
  alerts?: FinanceAiStrategyAlert[];
};

export type FinanceAiBolinger15FastMovementChecks = {
  priorVolClosed?: boolean;
  priorVolPartialClosed?: boolean;
  volExpandedAfterPremarket?: boolean;
  bbWidthPctPremarket?: number;
  bbWidthPctAtOpen?: number;
  volExpansionVsPremarketRatio?: number;
  volExpansionDirection?: string;
  volExpansionConfirmed?: boolean;
  volExpansionProbable?: boolean;
  volExpansionPending?: boolean;
  volExpansionMinute?: number;
  volExpansionMinuteEt?: string;
  volExpansionConfirmMinute?: number;
  volExpansionConfirmEt?: string;
  volExpansionTier?: string;
  volExpansionConsensusScore?: number;
  volExpansionConsensusNote?: string;
  volWidthStepExpanding?: boolean;
  decisionTimingStatus?: "good" | "probable" | "late" | "pending" | string;
  decisionLastSignalEt?: string;
  decisionLastSignalMinutesEt?: number;
  decisionDeadlineEt?: string;
  decisionLate?: boolean;
  simulationMinutesEt?: number;
  simulationTimeEt?: string;
  volAfterPremarketNote?: string;
  volBandDirectionOk?: boolean;
  volBandDirectionNote?: string;
  volBandFullMouth?: boolean;
  volWidthExpanded?: boolean;
  openingBarSlot?: string;
  openingAssessmentOrder?: string;
  openingPatternScore?: number;
  openingMin1BarCount?: number;
  openingMin1DecisionBarCount?: number;
  openingMin1WindowEt?: string;
  openingMin1Ready?: boolean;
  decisionBarSource?: string;
  decisionBarMin1Count?: number;
  movementDecisionWindowEt?: string;
  opening5mProvisional?: boolean;
  secondCandle?: FinanceAiBolinger15FastMovementChecks;
  bbUpperPremarket?: number;
  bbUpperAtOpen?: number;
  bbLowerPremarket?: number;
  bbLowerAtOpen?: number;
  volAfterPremarketNote?: string;
  priorVolScore?: number;
  priorVolClosedLevel?: string;
  volGreaterThanPriorDay?: boolean;
  volExpansionRatio?: number;
  volExpansionTier?: string;
  volExpansionScore?: number;
  volAngleNote?: string;
  bbWidthPctPriorEod?: number;
  opensInsideBb15m?: boolean;
  openingGateFailed?: boolean;
  hourlyBbMidCrossOverride?: boolean;
  hourlyBbMidCrossAt?: string;
  hourlyBbMidCrossMiddle?: number;
  hourlyBbMidCrossDirection?: string;
  hourlyBbMidOverrideNote?: string;
  cutsBbMiddle?: boolean;
  cutsTrendReinforcement?: boolean;
  cutsPriorClose?: boolean;
  cutsPending?: boolean;
  cutVsBb15Pending?: boolean;
  cutsOpposite2hTrend?: boolean;
  volOpeningNewTrend?: boolean;
  volOpeningSameDirection?: boolean;
  probabilityScore?: number;
  lateralBoost?: boolean;
  priorBb15TrendDirection?: string;
  priorBb15BbMidSlope?: string;
  priorBb15MoveDirection?: string;
  priorTwoHourTrend?: string;
  priorTwoHourMoveDirection?: string;
  opensInsideBbUpper?: number;
  opensInsideBbLower?: number;
  opensInsideBbMiddle?: number;
  opensInsideBbReference?: string;
  opensInsideFormingClose?: number;
  opensInsideOpenPrice?: number;
  cutsBbMiddlePrevClose?: number;
  cutsBbMiddleOpen?: number;
  cutsBbMiddleClose?: number;
  cutsBbMiddleLevel?: number;
  cutsBbMiddleReference?: string;
  cutsBbMiddleCrossMode?: string;
  cutsBbMiddleConfirmed?: boolean;
  cutsBbMiddleEarlyCross?: boolean;
  cutsBbMiddlePendingConfirmation?: boolean;
  cutsBbMiddleAboutToCross?: boolean;
  cutsBbMiddleAboutToCrossDirection?: string;
  cutsBbMiddleAboutToCrossMinute?: number;
  cutsBbMiddleAboutToCrossEt?: string;
  cutsBbMiddleBarDatetime?: string;
  cutsBbMiddlePrevMid?: number;
  openNearBandEdge?: boolean;
  bbUpperAtOpen?: number;
  bbLowerAtOpen?: number;
  openPrice?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  sessionWindow?: string;
  breaksPriorClose?: boolean;
  insideBb15m?: boolean | null;
  bbMidAligned?: boolean;
  volOpeningOnSide?: boolean;
  volNote?: string;
  candleDirection?: string;
  moveDirection?: string;
  bbPosition?: string;
  bbMidSlope?: string;
  volState?: string;
  bbWidthPct?: number;
  price?: number;
  priorClose?: number;
  rulesMet?: number;
  rulesTotal?: number;
  volAyerClosed?: boolean;
  volAyerParallel?: boolean;
  volAyerOk?: boolean;
  volNowChanging?: boolean;
  volNowSameDirection?: boolean;
  volNowOk?: boolean;
  volHoyOk?: boolean;
  puntoMedioCutProbable?: boolean;
  puntoMedioCutCrossProbable?: boolean;
  puntoMedioCutVsBb15Probable?: boolean;
  puntoMedioCutExpectedDirection?: string;
  puntoMedioCutPhase?: string;
  puntoMedioCutGapPct?: number;
  puntoMedioCutConfirmed?: boolean;
  bbMidDirectionOk?: boolean;
  candleGrowthOk?: boolean;
  bandsOpeningOk?: boolean;
  bbMidSlope?: string;
  bbUpperSlope?: string;
  bandsOpeningNote?: string;
  counterTrendBoost?: boolean;
  directionConfirmed?: boolean;
  directionProbable?: boolean;
  directionChecksMet?: number;
  directionChecksTotal?: number;
  directionPhase?: string;
  priorTrendDirection?: string;
  priorBbMidSlope?: string;
};

export type FinanceAiBolinger15Volatility = {
  phase?: string;
  activePhase?: "eod" | "precheck" | "opening" | string;
  rulesMet?: number;
  rulesTotal?: number;
  volAyer?: {
    closed?: boolean;
    parallel?: boolean;
    ok?: boolean;
    partialClosed?: boolean;
    score?: number;
    closedLevel?: string;
    volState?: string;
    bbWidthPctEod?: number;
    trendDirection?: string;
    bbMidSlope?: string;
  };
  volNow?: {
    changing?: boolean;
    sameDirection?: boolean;
    ok?: boolean;
    direction?: string;
    volState?: string;
    bbWidthPct?: number;
    bbWidthPctPriorEod?: number;
    expansionRatio?: number;
    expansionTier?: string;
    note?: string;
  };
  volHoy?: {
    ok?: boolean;
    greaterThanPrior?: boolean;
    sameDirection?: boolean;
    expansionRatio?: number;
    expansionTier?: string;
    expansionScore?: number;
    volState?: string;
    bbWidthPct?: number;
    bbWidthPctPriorEod?: number;
    direction?: string;
    note?: string;
  };
};

export type FinanceAiBolinger15DirectionConfirmation = {
  predictedDirection?: string;
  bbMidDirectionOk?: boolean;
  bbMidSlope?: string;
  candleGrowthOk?: boolean;
  candleDirection?: string;
  bandsOpeningOk?: boolean;
  bandsOpeningNote?: string;
  bbUpperSlope?: string;
  counterTrendBoost?: boolean;
  priorBb15TrendDirection?: string;
  directionConfirmed?: boolean;
  directionProbable?: boolean;
  directionChecksMet?: number;
  directionChecksTotal?: number;
  directionPhase?: string;
};

export type FinanceAiBolinger15FastMovementTicker = {
  symbol?: string;
  hardcoded?: boolean;
  candidate?: boolean;
  excluded?: boolean;
  signal?: "none" | "watch" | "triggered" | "confirmed" | "failed" | string;
  direction?: string;
  summary?: string;
  reason?: string;
  lastRunAt?: string;
  lastPhase?: string;
  lastBbWidthPct?: number;
  rulesMet?: number;
  rulesTotal?: number;
  lastAssessmentAt?: string;
  lastAssessmentPhase?: string;
  manualAssessmentAt?: string;
  assessmentSource?: "manual" | "manual_fresh" | "scheduled" | "simulation" | string;
  decisionTimingStatus?: "good" | "probable" | "late" | "pending" | string;
  decisionLastSignalEt?: string;
  decisionLate?: boolean;
  simulationTradeDate?: string;
  simulationMinutesEt?: number;
  simulationTimeEt?: string;
  min15FreshFetch?: boolean;
  precheck928Scheduled?: FinanceAiBolinger15FastMovementTicker["precheck928"];
  openingScheduled?: FinanceAiBolinger15FastMovementTicker["opening"];
  validation10amScheduled?: FinanceAiBolinger15FastMovementTicker["validation10am"];
  precheckRulesMet?: number;
  precheckRulesTotal?: number;
  predictionOutcome?: "confirmed" | "failed" | "pending" | "no_prediction" | string;
  entryReady?: boolean;
  entryBarSlot?: string;
  directionConfirmation?: FinanceAiBolinger15DirectionConfirmation;
  validation10am?: {
    outcome?: "confirmed" | "failed" | "pending" | "no_prediction" | string;
    achieved?: boolean;
    predictedSignal?: string;
    predictedDirection?: string;
    rulesMet?: number;
    rulesTotal?: number;
    closeVsPriorClose?: number;
    closeVsPriorClosePct?: number;
    directionOk?: boolean;
    momentumOk?: boolean;
    bar1?: { datetime?: string; open?: number; close?: number; high?: number; low?: number };
    bar2?: { datetime?: string; open?: number; close?: number; high?: number; low?: number };
    summary?: string;
    evaluatedAtEt?: string;
    reason?: string;
    barsAvailable?: number;
  };
  checks?: FinanceAiBolinger15FastMovementChecks;
  eodSetup?: {
    passed?: boolean;
    priorDate?: string;
    priorClose?: number;
    trendDirection?: string;
    bbMidSlope?: string;
    volState?: string;
    volClosed?: boolean;
    volPartialClosed?: boolean;
    priorVolScore?: number;
    priorVolClosedLevel?: string;
    bbWidthCompressRatio?: number;
    lateralBoost?: boolean;
    priorDayParallel?: boolean;
    probabilityBoost?: number;
    priorTwoHourTrend?: string;
    priorTwoHourMoveDirection?: string;
    priorTwoHourEvidence?: string;
    bbWidthPct?: number;
    bbPosition?: string;
    reason?: string;
    priorDayBarCount?: number;
  };
  precheck928?: {
    candidate?: boolean;
    expectedOpen?: number;
    priorClose?: number;
    gapPct?: number;
    breaksPriorClose?: boolean;
    expectedDirection?: string;
    reason?: string;
    puntoMedioCutProbable?: boolean;
    rulesMet?: number;
    rulesTotal?: number;
    checks?: FinanceAiBolinger15FastMovementChecks;
    directionConfirmation?: FinanceAiBolinger15DirectionConfirmation;
  };
  opening?: {
    signal?: string;
    direction?: string;
    summary?: string;
    checks?: FinanceAiBolinger15FastMovementChecks;
    directionConfirmation?: FinanceAiBolinger15DirectionConfirmation;
    bbWidthPct?: number;
  };
  volatility?: FinanceAiBolinger15Volatility;
  min15DataSource?: string;
  min15CacheHit?: boolean;
  min15DataSlots?: Array<{
    slot?: string;
    dataSource?: string;
    cacheHit?: boolean;
    collectedAtEt?: string;
    record?: { window?: string; barCount?: number; collectedAtEt?: string };
  }>;
};

export type FinanceAiBolinger15FastMovementStatus = {
  jobId?: string;
  tradeDate?: string;
  calendarDate?: string;
  effectiveTradeDate?: string;
  sessionDayActive?: boolean;
  updatedAt?: string;
  lastRunAt?: string;
  lastRunPhase?: string;
  phase?: string;
  currentPhase?: string;
  minutesEt?: number;
  windowActive?: boolean;
  sessionStartEt?: string;
  sessionEndEt?: string;
  sessionFinalAt?: string;
  sessionFinalEt?: string;
  hasSessionResults?: boolean;
  sessionComplete?: boolean;
  pollIntervalSec?: number;
  precheckAtEt?: string;
  openingPollEndEt?: string;
  validationAtEt?: string;
  volatilitySchema?: Record<string, Record<string, string>>;
  watchlist?: string[];
  watchlistSource?: string;
  tickersToday15M?: FinanceAiTickersToday15M | null;
  candidates?: string[];
  tickers?: Record<string, FinanceAiBolinger15FastMovementTicker>;
  alerts?: Array<{
    at?: string;
    symbol?: string;
    signal?: string;
    direction?: string;
    summary?: string;
    type?: string;
    code?: string;
    checks?: FinanceAiBolinger15FastMovementChecks;
  }>;
  recentRuns?: Array<{
    at?: string;
    phase?: string;
    symbolCount?: number;
    candidateCount?: number;
    triggeredCount?: number;
  }>;
  buySellEnabled?: boolean;
  buySellTickers?: string[];
  dataPreparation?: {
    ready?: boolean;
    summary?: string;
    notReadySymbols?: string[];
    checkedAt?: string;
    globalIssues?: Array<{ code?: string; message?: string }>;
    symbolCount?: number;
    readyCount?: number;
  };
  pre930Readiness?: {
    ready?: boolean;
    dataReady?: boolean;
    poolReady?: boolean;
    summary?: string;
    minutesEt?: number;
    minutesToSession?: number;
    checkedAt?: string;
    tickersToday15MPreview?: {
      symbols?: string[];
      count?: number;
      minPassPct?: number;
    };
    notReadySymbols?: string[];
  };
};

/** mov15m session status — alias of legacy BB15 status shape. */
export type FinanceAiMov15mStatus = FinanceAiBolinger15FastMovementStatus;
export type FinanceAiMov15mTicker = FinanceAiBolinger15FastMovementTicker;

export type FinanceAiStrategyMetRequirement = {
  requirementId?: string;
  label?: string;
  ruleKey?: string;
  status?: string;
  evidence?: string;
};

export type FinanceAiStrategyMetEval = {
  strategyId?: string;
  variantId?: string;
  strategyName?: string;
  direction?: string;
  fit?: string;
  probabilityPct?: number;
  qualified?: boolean;
  summary?: { met?: number; partial?: number; total?: number; notMet?: number };
  requirements?: FinanceAiStrategyMetRequirement[];
};

export type FinanceAiStrategyMetWindow = {
  strategyId?: string;
  variantId?: string;
  strategyName?: string;
  direction?: string;
  fit?: string;
  startAt?: string;
  startMinutesEt?: number;
  startPrice?: number;
  endAt?: string;
  endMinutesEt?: number;
  endPrice?: number;
  lastAt?: string;
  lastMinutesEt?: number;
  lastPrice?: number;
  profile?: string;
  requirementsMet?: number;
  requirementsTotal?: number;
  active?: boolean;
};

export type FinanceAiStrategyMetTicker = {
  active?: Record<string, FinanceAiStrategyMetWindow>;
  completed?: FinanceAiStrategyMetWindow[];
  currentEval?: {
    updatedAt?: string;
    minutesEt?: number;
    price?: number;
    profile?: string;
    strategies?: FinanceAiStrategyMetEval[];
  };
};

export type FinanceAiStrategyMetStatus = {
  tradeDate?: string;
  minutesEt?: number;
  availableAfter932?: boolean;
  availableFromMinutesEt?: number;
  updatedAt?: string;
  tickers?: Record<string, FinanceAiStrategyMetTicker>;
};
