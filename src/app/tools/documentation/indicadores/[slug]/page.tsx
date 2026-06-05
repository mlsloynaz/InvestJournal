import { notFound } from "next/navigation";
import { AnalysisElementView } from "@/components/documentation/AnalysisElementView";
import { AnalysisElementViewToggle } from "@/components/documentation/AnalysisElementViewToggle";
import { AnalysisElementsBackLink } from "@/components/documentation/AnalysisElementsBackLink";
import { DocsBackLink } from "@/components/documentation/DocsBackLink";
import { PremarketChecklistView } from "@/components/documentation/PremarketChecklistView";
import { getBollingerBandsEnhancedElement } from "@/data/bollinger-bands-enhanced";
import { getAnalysisElement, listAnalysisElements } from "@/data/analysis-elements";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listAnalysisElements().map((item) => ({ slug: item.slug }));
}

export default async function AnalysisElementPage({ params }: Props) {
  const { slug } = await params;
  const element = getAnalysisElement(slug);
  if (!element) notFound();

  const bollingerEnhanced =
    slug === "bollinger-bands" ? getBollingerBandsEnhancedElement() : undefined;

  return (
    <div className={`space-y-6 ${slug === "checklist-pre-market" ? "max-w-6xl" : "max-w-4xl"}`}>
      <div className="flex flex-wrap gap-4">
        <DocsBackLink />
        <AnalysisElementsBackLink />
      </div>
      {slug === "checklist-pre-market" ? (
        <PremarketChecklistView element={element} />
      ) : slug === "bollinger-bands" && bollingerEnhanced ? (
        <AnalysisElementViewToggle
          normalElement={element}
          enhancedElement={bollingerEnhanced}
          storageKey="analysis-view-bollinger-bands"
        />
      ) : (
        <AnalysisElementView element={element} />
      )}
    </div>
  );
}
