import { updateNoteTypeConfig } from "@/server/actions/note-types";
import { listAllNoteTypeConfigs } from "@/server/services/note-types";

export default async function NoteTypesPage() {
  let types: Awaited<ReturnType<typeof listAllNoteTypeConfigs>> = [];

  try {
    types = await listAllNoteTypeConfigs();
  } catch {
    return <p className="text-sm text-red-700">Base de datos no disponible.</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">Tipos de notas</h1>
        <p className="text-sm text-gray-600 mt-1">
          Etiquetas mostradas al crear notas (Nota, Predicción, Error). El código interno no
          cambia.
        </p>
      </header>

      <ul className="space-y-4">
        {types.map((t) => (
          <li key={t.id} className="bg-white border rounded p-4">
            <form action={updateNoteTypeConfig} className="space-y-3">
              <input type="hidden" name="id" value={t.id} />
              <p className="text-xs font-mono text-gray-500">Código: {t.code}</p>
              <div className="flex flex-wrap gap-3">
                <label className="text-sm flex-1 min-w-[120px]">
                  Etiqueta *
                  <input name="label" defaultValue={t.label} required className="w-full mt-1" />
                </label>
                <label className="text-sm flex-[2] min-w-[200px]">
                  Descripción
                  <input name="hint" defaultValue={t.hint ?? ""} className="w-full mt-1" />
                </label>
                <label className="text-sm w-20">
                  Orden
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={t.sortOrder}
                    className="w-full mt-1"
                  />
                </label>
                <label className="text-sm flex items-end gap-2 pb-1">
                  <input type="checkbox" name="active" defaultChecked={t.active} />
                  Activo
                </label>
              </div>
              <button type="submit">Guardar</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
