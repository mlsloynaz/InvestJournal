import { DocsTileGrid } from "@/components/documentation/DocsTileGrid";
import { NewsSourcesPanel } from "@/components/documentation/NewsSourcesPanel";
import { docsNewsSources } from "@/data/docs-news-sources";
import { docsTiles } from "@/data/docs-tiles";

export default function ToolsDocsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">Docs</h1>
        <p className="text-sm text-gray-600 mt-1">
          Documentación de referencia para operar con el checklist Investep.
        </p>
      </header>
      <NewsSourcesPanel sources={docsNewsSources} />
      <DocsTileGrid tiles={docsTiles} />
    </div>
  );
}
