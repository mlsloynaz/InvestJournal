import Link from "next/link";
import { StrategyDocNavLoader } from "@/components/documentation/StrategyDocNav";
import { MarkdownDocument } from "@/components/documentation/MarkdownDocument";
import {
  listStrategyDocs,
  readStrategyAllDoc,
  rewriteStrategyDocAssetUrls,
} from "@/lib/strategy-docs";
import { DEFAULT_STRATEGIES_MD_DIR, getStrategiesBaseDir } from "@/lib/strategy-markdown";
import { TOOLS_STRATEGIES_PATH } from "@/lib/tools-paths";

export const dynamic = "force-dynamic";

export default async function StrategyDocsIndexPage() {
  const [docs, strategyAll] = await Promise.all([listStrategyDocs(), readStrategyAllDoc()]);
  const baseDir = getStrategiesBaseDir();

  return (
    <div className="space-y-6 w-full">
      <StrategyDocNavLoader />

      <header className="space-y-2">
        <div className="flex flex-wrap gap-3 items-center">
          <Link href={TOOLS_STRATEGIES_PATH} className="text-sm text-investep-navy underline">
            ← Strategies (registro)
          </Link>
        </div>
        {!strategyAll ? (
          <>
            <h1 className="text-2xl font-bold text-investep-navy">Documentación de estrategias</h1>
            <p className="text-sm text-gray-600">
              Archivos Markdown en <code className="bg-white px-1 text-xs">{baseDir}</code>. Solo
              lectura — edita el <code className="bg-white px-1 text-xs">.md</code> en disco y
              recarga.
            </p>
          </>
        ) : null}
      </header>

      {strategyAll ? (
        <>
          <header className="text-sm text-gray-500">
            <p>
              Archivo: <code className="bg-white px-1 text-xs">{strategyAll.filename}</code>
            </p>
          </header>
          <MarkdownDocument source={rewriteStrategyDocAssetUrls(strategyAll.markdown)} />
        </>
      ) : docs.length === 0 ? (
        <div className="bg-white border rounded-lg p-6 text-sm text-gray-600 space-y-2">
          <p>
            No se encontró <code>strategyall.md</code> ni archivos <code>estrategia-*.md</code> en
            la carpeta configurada.
          </p>
          <p>
            Verifica <code>STRATEGIES_MD_DIR</code> en tu <code>.env</code> (por defecto{" "}
            <code>{DEFAULT_STRATEGIES_MD_DIR}</code>).
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          Falta <code>strategyall.md</code> en <code>{baseDir}</code>. Usa los botones{" "}
          <strong>1–4</strong> arriba para abrir cada estrategia.
        </p>
      )}
    </div>
  );
}
