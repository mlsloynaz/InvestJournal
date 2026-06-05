import Link from "next/link";
import { AnalysisType } from "@prisma/client";
import type { TodayNoteView, TodayNotesByTicker } from "@/server/services/dashboard";

const typeLabels: Record<AnalysisType, string> = {
  NOTE: "Nota",
  PREDICTION: "Predicción",
  MISTAKE: "Error",
};

const typeStyles: Record<AnalysisType, string> = {
  NOTE: "bg-blue-100 text-blue-900",
  PREDICTION: "bg-amber-100 text-amber-900",
  MISTAKE: "bg-red-100 text-red-900",
};

type Props = {
  today: string;
  groups: TodayNotesByTicker[];
};

function TickerHeader({ group }: { group: TodayNotesByTicker }) {
  return (
    <>
      <Link
        href={`/tickers/${group.symbol}/analysis`}
        className="font-bold text-investep-navy hover:text-investep-gold"
      >
        {group.symbol}
      </Link>
      {group.name && <span className="text-xs text-gray-500">{group.name}</span>}
      {group.isFavorite && (
        <span className="text-[10px] uppercase tracking-wide text-investep-gold font-semibold">
          Favorito
        </span>
      )}
    </>
  );
}

function NoteItem({ note, isLatest = false }: { note: TodayNoteView; isLatest?: boolean }) {
  return (
    <li className="text-sm">
      <div className="flex flex-wrap items-center gap-2 mb-0.5">
        <time className="text-xs text-gray-500">{note.time}</time>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeStyles[note.type]}`}
        >
          {typeLabels[note.type]}
        </span>
        {isLatest && (
          <span className="text-[10px] uppercase tracking-wide text-investep-gold font-semibold">
            Más reciente
          </span>
        )}
      </div>
      <p
        className={`text-gray-800 whitespace-pre-wrap ${isLatest ? "" : "line-clamp-3"}`}
      >
        {note.body}
      </p>
    </li>
  );
}

function NoteList({ notes }: { notes: TodayNoteView[] }) {
  return (
    <ul className="space-y-2 border-l-2 border-investep-gold/40 pl-3">
      {notes.map((note) => (
        <NoteItem key={note.id} note={note} />
      ))}
    </ul>
  );
}

function TickerNotesGroup({ group }: { group: TodayNotesByTicker }) {
  const latest = group.notes[0];
  const older = group.notes.slice(1);

  if (!latest) return null;

  return (
    <li>
      <div className="flex flex-wrap items-baseline gap-2 mb-2">
        <TickerHeader group={group} />
        {group.notes.length > 1 && (
          <span className="text-xs text-gray-500 font-medium">{group.notes.length} notas</span>
        )}
      </div>

      <ul className="space-y-2 border-l-2 border-investep-gold/40 pl-3">
        <NoteItem note={latest} isLatest={older.length > 0} />
      </ul>

      {older.length > 0 && (
        <details className="group mt-2">
          <summary className="text-xs text-investep-navy cursor-pointer mb-2 list-none [&::-webkit-details-marker]:hidden pl-3">
            <span className="group-open:hidden">
              Ver notas anteriores ({older.length}) ▾
            </span>
            <span className="hidden group-open:inline">Ocultar notas anteriores ▴</span>
          </summary>
          <NoteList notes={older} />
        </details>
      )}
    </li>
  );
}

export function DashboardTodayNotes({ today, groups }: Props) {
  if (groups.length === 0) {
    return (
      <section className="bg-white border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-investep-navy uppercase tracking-wide">
          Notas de hoy
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          No hay notas con fecha {today}. Agrégalas desde el análisis de un ticker.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border rounded-lg p-4 space-y-4">
      <h2 className="text-sm font-semibold text-investep-navy uppercase tracking-wide">
        Notas de hoy · {today}
      </h2>

      <ul className="space-y-4">
        {groups.map((group) => (
          <TickerNotesGroup key={group.symbol} group={group} />
        ))}
      </ul>
    </section>
  );
}
