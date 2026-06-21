export function strategyGraphApiUrl(strategyId: number, graphMarkdown: string): string | null {
  if (!graphMarkdown.trim()) return null;
  const match = graphMarkdown.match(/!\[[^\]]*]\(([^)]+)\)/);
  if (!match) return null;
  const href = match[1].trim();
  if (!href.startsWith("./images/")) return null;
  return `/api/strategies/${strategyId}/graph`;
}
