import {
  TOOLS_INDICADORES_PATH,
  TOOLS_STRATEGIES_DOCS_PATH,
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
    href: TOOLS_STRATEGIES_DOCS_PATH,
    title: "Estrategias (MD)",
    description: "Documentación completa en Markdown desde C:\\dta\\strategies.",
  },
  {
    href: TOOLS_STRATEGIES_PATH,
    title: "Strategies (registro)",
    description: "Listado en base de datos para etiquetar notas y predicciones.",
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
