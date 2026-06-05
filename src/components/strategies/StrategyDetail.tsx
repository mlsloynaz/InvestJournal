import Image from "next/image";
import { DeleteStrategyForm } from "@/components/strategies/DeleteStrategyForm";
import {
  addStrategyRequirement,
  deleteStrategyGraph,
  deleteStrategyRequirement,
  updateStrategyBestFor,
  updateStrategyCommonMistake,
  updateStrategyName,
  uploadStrategyGraph,
} from "@/server/actions/strategies";

type Requirement = { id: number; text: string };

type Props = {
  id: number;
  name: string;
  bestFor: string | null;
  commonMistake: string | null;
  graphPath: string | null;
  graphFileName: string | null;
  requirements: Requirement[];
};

export function StrategyDetail({
  id,
  name,
  bestFor,
  commonMistake,
  graphPath,
  graphFileName,
  requirements,
}: Props) {
  return (
    <div className="space-y-6">
      <form action={updateStrategyName} className="bg-white border rounded-lg p-4 flex flex-wrap gap-3 items-end">
        <input type="hidden" name="id" value={id} />
        <label className="text-sm flex-1 min-w-[200px]">
          <span className="font-semibold text-investep-navy">Nombre</span>
          <input name="name" defaultValue={name} required className="w-full mt-1 text-lg font-bold" />
        </label>
        <button type="submit">Guardar nombre</button>
      </form>

      <section className="bg-white border rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-investep-navy border-b pb-2">Gráfico</h2>
        {graphPath ? (
          <div className="space-y-3">
            <div className="relative aspect-video max-w-2xl bg-gray-100 rounded-lg overflow-hidden border">
              <Image
                src={graphPath}
                alt={`Gráfico ${name}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 600px"
                unoptimized
              />
            </div>
            <p className="text-xs text-gray-500 space-y-0.5">
              {graphFileName && <span className="block">Archivo: {graphFileName}</span>}
              <span className="block font-mono text-[10px] break-all">
                public{graphPath}
              </span>
            </p>
            <form action={deleteStrategyGraph}>
              <input type="hidden" name="strategyId" value={id} />
              <button type="submit" className="!bg-red-700 text-xs">
                Quitar gráfico
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Sin gráfico cargado.</p>
        )}
        <form action={uploadStrategyGraph} className="flex flex-wrap gap-3 items-end pt-2 border-t">
          <input type="hidden" name="strategyId" value={id} />
          <label className="text-sm">
            {graphPath ? "Reemplazar imagen" : "Subir gráfico"}
            <input type="file" name="file" accept="image/*" required className="block mt-1 text-xs" />
          </label>
          <button type="submit" className="!bg-investep-gold !text-investep-navy">
            Guardar gráfico
          </button>
        </form>
      </section>

      <section className="bg-white border rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-investep-navy border-b pb-2">Requisitos</h2>
        {requirements.length === 0 ? (
          <p className="text-sm text-gray-500">Sin requisitos. Agrega líneas abajo.</p>
        ) : (
          <ul className="space-y-2">
            {requirements.map((req, index) => (
              <li
                key={req.id}
                className="flex gap-2 items-start text-sm bg-investep-cream/40 rounded px-3 py-2"
              >
                <span className="text-investep-gold font-bold shrink-0">{index + 1}.</span>
                <span className="flex-1 text-investep-navy">{req.text}</span>
                <form action={deleteStrategyRequirement}>
                  <input type="hidden" name="requirementId" value={req.id} />
                  <button type="submit" className="!bg-red-700 !px-2 !py-0.5 text-xs shrink-0">
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addStrategyRequirement} className="flex flex-wrap gap-2 items-end border-t pt-3">
          <input type="hidden" name="strategyId" value={id} />
          <label className="text-sm flex-1 min-w-[200px]">
            Nuevo requisito
            <input
              name="text"
              required
              placeholder="Ej. Volumen por encima del promedio"
              className="w-full mt-1"
            />
          </label>
          <button type="submit">+ Agregar</button>
        </form>
      </section>

      <section className="bg-white border rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-investep-navy border-b pb-2">Mejor para</h2>
        <form action={updateStrategyBestFor} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <textarea
            name="bestFor"
            rows={5}
            defaultValue={bestFor ?? ""}
            placeholder="Describe en qué contexto o mercado funciona mejor esta estrategia..."
            className="w-full text-sm"
          />
          <button type="submit">Guardar</button>
        </form>
      </section>

      <section className="bg-white border rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-investep-navy border-b pb-2">Error común</h2>
        <form action={updateStrategyCommonMistake} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <textarea
            name="commonMistake"
            rows={5}
            defaultValue={commonMistake ?? ""}
            placeholder="Errores frecuentes al aplicar esta estrategia y cómo evitarlos..."
            className="w-full text-sm"
          />
          <button type="submit">Guardar</button>
        </form>
      </section>

      <DeleteStrategyForm strategyId={id} strategyName={name} />
    </div>
  );
}
