export type EstrategiaDocForExport = {
  slug: string;
  filename: string;
  title: string;
  markdown: string;
};

export type PlaybookAutomatable = "true" | "false" | "partial";

export type RequirementClassification = "mandatory" | "support" | "execution";

export type StrategyPlaybookRequirement = {
  id: string;
  label: string;
  timeframe: string;
  ruleKey: string;
  automatable: PlaybookAutomatable;
  classification?: RequirementClassification;
  supportBonusPct?: number;
};

export type StrategyPlaybookVariant = {
  id: string;
  name: string;
  direction: string;
  requirements: StrategyPlaybookRequirement[];
};

export type StrategyPlaybook = {
  id: string;
  title: string;
  sourceFile: string;
  direction: string;
  mnemonic?: string;
  timeframes: {
    summary?: string;
    confirm?: string;
    entry?: string;
    context?: string[];
  };
  plans?: string[];
  exits?: string[];
  requirements: StrategyPlaybookRequirement[];
  variants?: StrategyPlaybookVariant[];
};
