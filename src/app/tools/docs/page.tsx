import { DocsTileGrid } from "@/components/documentation/DocsTileGrid";
import { docsTiles } from "@/data/docs-tiles";

export default function ToolsDocsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">Docs</h1>
        <p className="text-sm text-gray-600 mt-1">
          Documentación de referencia para operar con el checklist Investep.
        </p>
      </header>
      <DocsTileGrid tiles={docsTiles} />
    </div>
  );
}
