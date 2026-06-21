export type DocumentationWebsite = {
  href: string;
  label: string;
  uses: string[];
};

/** Enlaces de documentación (notas Investep). */
export const documentationWebsites: DocumentationWebsite[] = [
  {
    href: "https://finviz.com",
    label: "www.finviz.com",
    uses: ["Análisis fundamental"],
  },
  {
    href: "https://www.marketwatch.com",
    label: "www.marketwatch.com",
    uses: ["Premarket — Aftermarket"],
  },
  {
    href: "https://finance.yahoo.com",
    label: "www.yahoofinance.com",
    uses: [
      "Calcular rangos óptimos de precio",
      "Watchlist",
      "Noticias",
    ],
  },
  {
    href: "https://www.optionslam.com",
    label: "www.optionslam.com",
    uses: ["Plataforma reportes earnings"],
  },
  {
    href: "https://www.federalreserve.gov",
    label: "www.federalreserve.gov",
    uses: ["Reuniones de FED"],
  },
  {
    href: "https://www.bloomberg.com",
    label: "www.bloomberg.com",
    uses: ["Noticias"],
  },
  {
    href: "https://www.investing.com",
    label: "www.investing.com",
    uses: ["Noticias"],
  },
];

export const documentationWebsitesColumns: DocumentationWebsite[][] = [
  documentationWebsites.slice(0, 4),
  documentationWebsites.slice(4),
];
