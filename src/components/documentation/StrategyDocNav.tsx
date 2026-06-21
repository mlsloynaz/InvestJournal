import Link from "next/link";
import { DocsBackLink } from "@/components/documentation/DocsBackLink";
import { listStrategyDocs } from "@/lib/strategy-docs";
import { TOOLS_STRATEGIES_DOCS_PATH, strategyDocPath } from "@/lib/tools-paths";

function strategyNavLabel(slug: string): string {
  const match = /^estrategia-(\d+)/.exec(slug);
  if (match) return String(parseInt(match[1], 10));
  return slug;
}

const navButtonClass =
  "inline-flex items-center justify-center min-h-11 min-w-11 px-4 rounded-lg border-2 text-lg font-semibold transition-colors";

function navLinkClass(isCurrent: boolean): string {
  if (isCurrent) {
    return `${navButtonClass} border-investep-navy bg-investep-navy text-white cursor-default`;
  }
  return `${navButtonClass} border-investep-navy/25 bg-white text-investep-navy hover:bg-investep-cream hover:border-investep-navy/50`;
}

type StrategyDocNavProps = {
  docs: { slug: string }[];
  currentSlug?: string;
};

export function StrategyDocNav({ docs, currentSlug }: StrategyDocNavProps) {
  const onIndex = currentSlug == null;

  return (
    <div className="space-y-3">
      <DocsBackLink />
      <nav className="flex flex-wrap gap-2" aria-label="Estrategias">
        {onIndex ? (
          <span className={navLinkClass(true)} aria-current="page">
            Todas
          </span>
        ) : (
          <Link href={TOOLS_STRATEGIES_DOCS_PATH} className={navLinkClass(false)}>
            Todas
          </Link>
        )}
        {docs.map((doc) => {
          const label = strategyNavLabel(doc.slug);
          const isCurrent = doc.slug === currentSlug;
          return isCurrent ? (
            <span key={doc.slug} className={navLinkClass(true)} aria-current="page">
              {label}
            </span>
          ) : (
            <Link
              key={doc.slug}
              href={strategyDocPath(doc.slug)}
              className={navLinkClass(false)}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export async function StrategyDocNavLoader({ currentSlug }: { currentSlug?: string }) {
  const docs = await listStrategyDocs();
  return <StrategyDocNav docs={docs} currentSlug={currentSlug} />;
}
