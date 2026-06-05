import {
  TOOLS_INDICADORES_PATH,
  TOOLS_STRATEGIES_PATH,
  TOOLS_WEBSITES_PATH,
} from "@/lib/tools-paths";

export type DocsTile = {
  href: string;
  title: string;
  description: string;
};

export const docsTiles: DocsTile[] = [
  {
    href: TOOLS_STRATEGIES_PATH,
    title: "Strategies",
    description: "Estrategias de trading: gráficos, requisitos y notas.",
  },
  {
    href: TOOLS_WEBSITES_PATH,
    title: "Websites",
    description: "Enlaces útiles: Finviz, MarketWatch, Yahoo Finance y más.",
  },
  {
    href: TOOLS_INDICADORES_PATH,
    title: "Elementos de análisis",
    description: "Temporalidades, Bollinger, medias móviles y peso de cada elemento.",
  },
];
