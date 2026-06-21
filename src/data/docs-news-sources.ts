export type DocsNewsSource = {
  href: string;
  label: string;
};

/** Páginas de noticias usadas en Investep (material de referencia). */
export const docsNewsSources: DocsNewsSource[] = [
  {
    href: "https://www.bloomberg.com",
    label: "Bloomberg",
  },
  {
    href: "https://finance.yahoo.com",
    label: "Yahoo Finance",
  },
  {
    href: "https://www.investing.com",
    label: "Investing",
  },
];
