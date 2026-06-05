import { createFedMeetingAction, deleteFedMeetingAction } from "@/app/config/fed-meetings/actions";
import { listFedMeetings } from "@/server/actions/fed-meetings";

export default async function FedMeetingsPage() {
  let meetings: Awaited<ReturnType<typeof listFedMeetings>> = [];

  try {
    meetings = await listFedMeetings();
  } catch {
    return <p className="text-sm text-red-700">Base de datos no disponible.</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">Fed meetings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Calendario de reuniones FED (referencia para el ítem 1 del análisis básico).
        </p>
      </header>

      <form action={createFedMeetingAction} className="bg-white border rounded p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm">
            Fecha reunión *
            <input type="date" name="meetingDate" required className="block mt-1" />
          </label>
          <label className="text-sm flex-1 min-w-[200px]">
            Notas
            <input name="notes" placeholder="Opcional" className="block mt-1 w-full" />
          </label>
          <button type="submit">Agregar</button>
        </div>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Notas</th>
            <th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {meetings.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center text-gray-500 py-4">
                Sin reuniones registradas
              </td>
            </tr>
          )}
          {meetings.map((m) => (
            <tr key={m.id}>
              <td className="font-medium whitespace-nowrap">
                {m.meetingDate.toISOString().slice(0, 10)}
              </td>
              <td className="text-sm">{m.notes ?? "—"}</td>
              <td>
                <form action={deleteFedMeetingAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="!bg-red-700 !px-2 !py-0.5 text-xs">
                    ×
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
