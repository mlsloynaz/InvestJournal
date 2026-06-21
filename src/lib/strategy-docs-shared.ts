export type StrategyPicItem = {
  file: string;
  filename: string;
  label: string;
  timeframe: string;
};

export function rewriteStrategyDocAssetUrl(relativePath: string): string {
  const relative = relativePath.replace(/^\.\//, "").replace(/\\/g, "/");
  return `/api/strategies/docs/asset?file=${encodeURIComponent(relative)}`;
}

export function rewriteStrategyDocAssetUrls(markdown: string): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_full, alt: string, src: string) => {
    const trimmed = src.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return `![${alt}](${trimmed})`;
    }
    return `![${alt}](${rewriteStrategyDocAssetUrl(trimmed)})`;
  });
}
