import { StrategyRowActions } from "@/components/strategies/StrategyRowActions";

export type StrategyListItem = {
  id: number;
  name: string;
  graphPath: string | null;
  bestFor: string | null;
  commonMistake: string | null;
  updatedAt: Date;
  _count: { requirements: number };
};

export function StrategyList({
  strategies,
  selectedId,
}: {
  strategies: StrategyListItem[];
  selectedId: number | null;
}) {
  if (strategies.length === 0) {
    return (
      <p className="text-sm text-gray-500 bg-white border rounded-lg p-6 text-center">
        No hay estrategias. Usa <strong>+ Nueva estrategia</strong> para crear una.
      </p>
    );
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th className="w-20">Gráfico</th>
            <th className="w-24">Requisitos</th>
            <th className="w-28">Mejor para</th>
            <th className="w-28">Error común</th>
            <th className="w-36">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map((s) => {
            const isSelected = selectedId === s.id;
            return (
              <tr key={s.id} className={isSelected ? "bg-investep-cream/60" : ""}>
                <td className="font-medium text-investep-navy">{s.name}</td>
                <td className="text-center text-xs">{s.graphPath ? "Sí" : "—"}</td>
                <td className="text-center">{s._count.requirements}</td>
                <td className="text-center text-xs">{s.bestFor ? "Sí" : "—"}</td>
                <td className="text-center text-xs">{s.commonMistake ? "Sí" : "—"}</td>
                <td>
                  <StrategyRowActions id={s.id} name={s.name} isSelected={isSelected} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
