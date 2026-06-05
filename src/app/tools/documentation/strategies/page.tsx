import Link from "next/link";
import { DocsBackLink } from "@/components/documentation/DocsBackLink";
import { StrategyCreateForm } from "@/components/strategies/StrategyCreateForm";
import { StrategyDetail } from "@/components/strategies/StrategyDetail";
import { StrategyList } from "@/components/strategies/StrategyList";
import { getDbErrorMessage } from "@/lib/db-error";
import { TOOLS_STRATEGIES_PATH } from "@/lib/tools-paths";
import { getStrategy, listStrategiesForCrud } from "@/server/actions/strategies";

type Props = {
  searchParams: Promise<{ id?: string; new?: string }>;
};

export default async function ToolsStrategiesPage({ searchParams }: Props) {
  const { id: idParam, new: newParam } = await searchParams;

  let strategies: Awaited<ReturnType<typeof listStrategiesForCrud>> = [];
  let selected: Awaited<ReturnType<typeof getStrategy>> = null;
  let pageError: string | null = null;

  const selectedId =
    idParam && Number.isFinite(parseInt(idParam, 10)) ? parseInt(idParam, 10) : null;

  try {
    strategies = await listStrategiesForCrud();
    if (selectedId != null) {
      selected = await getStrategy(selectedId);
    }
  } catch (e) {
    pageError = getDbErrorMessage(e);
  }

  if (pageError) {
    return (
      <div className="space-y-4 max-w-lg">
        <DocsBackLink />
        <h1 className="text-2xl font-bold text-investep-navy">Strategies</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm space-y-3">
          <p className="font-medium text-red-800">No se pudo cargar Strategies</p>
          <p className="text-red-700 text-xs font-mono break-all">{pageError}</p>
          <p className="text-gray-800">
            Suele faltar la tabla o una columna nueva. En PowerShell, desde la carpeta del
            proyecto:
          </p>
          <ol className="list-decimal list-inside text-gray-800 space-y-1">
            <li>
              <code className="bg-white px-1">docker compose up -d</code>
            </li>
            <li>
              <code className="bg-white px-1">npm run setup</code>
            </li>
            <li>
              Reinicia <code className="bg-white px-1">npm run dev</code>
            </li>
          </ol>
          <Link href={TOOLS_STRATEGIES_PATH} className="text-investep-navy underline text-sm">
            Reintentar
          </Link>
        </div>
      </div>
    );
  }

  if (selectedId != null && !selected) {
    return (
      <div className="space-y-4 max-w-4xl">
        <DocsBackLink />
        <h1 className="text-2xl font-bold text-investep-navy">Strategies</h1>
        <p className="text-sm text-gray-600">Estrategia no encontrada.</p>
        <Link href={TOOLS_STRATEGIES_PATH} className="text-investep-navy underline text-sm">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <DocsBackLink />
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">Strategies</h1>
        <p className="text-sm text-gray-600 mt-1">
          Crear, ver, editar y eliminar estrategias (gráfico, requisitos, mejor para, error común).
        </p>
      </header>

      <StrategyCreateForm defaultOpen={newParam === "1"} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-investep-navy uppercase tracking-wide">
          Listado
        </h2>
        <StrategyList strategies={strategies} selectedId={selected?.id ?? null} />
      </section>

      {selected ? (
        <section className="space-y-2 pt-4 border-t border-investep-navy/20">
          <div className="flex flex-wrap justify-between gap-2 items-center">
            <h2 className="text-sm font-semibold text-investep-navy uppercase tracking-wide">
              Editar: {selected.name}
            </h2>
            <Link href={TOOLS_STRATEGIES_PATH} className="text-xs text-investep-navy underline">
              Cerrar detalle
            </Link>
          </div>
          <StrategyDetail
            id={selected.id}
            name={selected.name}
            bestFor={selected.bestFor}
            commonMistake={selected.commonMistake}
            graphPath={selected.graphPath}
            graphFileName={selected.graphFileName}
            requirements={selected.requirements}
          />
        </section>
      ) : (
        strategies.length > 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Selecciona <strong>Ver / Editar</strong> en el listado para abrir una estrategia.
          </p>
        )
      )}
    </div>
  );
}
