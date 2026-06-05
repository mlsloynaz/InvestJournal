import { AnalysisType } from "@prisma/client";
import { prisma } from "@/lib/db";

export type NoteTypeRow = {
  id: number;
  code: string;
  label: string;
  hint: string | null;
  sortOrder: number;
  active: boolean;
};

const DEFAULTS: { code: AnalysisType; label: string; hint: string; sortOrder: number }[] = [
  { code: AnalysisType.NOTE, label: "Nota", hint: "Observación general del día", sortOrder: 1 },
  {
    code: AnalysisType.PREDICTION,
    label: "Predicción",
    hint: "Sesgo y probabilidades (p. ej. desde IA)",
    sortOrder: 2,
  },
  { code: AnalysisType.MISTAKE, label: "Error", hint: "Qué salió mal — para aprender", sortOrder: 3 },
];

function defaultsAsRows(): NoteTypeRow[] {
  return DEFAULTS.map((d, i) => ({
    id: i + 1,
    code: d.code,
    label: d.label,
    hint: d.hint,
    sortOrder: d.sortOrder,
    active: true,
  }));
}

function noteTypeDelegate() {
  return (
    prisma as {
      noteTypeConfig?: {
        upsert: (args: unknown) => Promise<unknown>;
        findMany: (args: unknown) => Promise<NoteTypeRow[]>;
      };
    }
  ).noteTypeConfig;
}

export async function ensureNoteTypeConfigs() {
  const delegate = noteTypeDelegate();
  if (!delegate) return;

  for (const d of DEFAULTS) {
    await delegate.upsert({
      where: { code: d.code },
      create: d,
      update: {},
    });
  }
}

export async function listNoteTypeConfigs(): Promise<NoteTypeRow[]> {
  const delegate = noteTypeDelegate();
  if (!delegate) return defaultsAsRows();

  try {
    await ensureNoteTypeConfigs();
    return delegate.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return defaultsAsRows();
  }
}

export async function listAllNoteTypeConfigs(): Promise<NoteTypeRow[]> {
  const delegate = noteTypeDelegate();
  if (!delegate) return defaultsAsRows();

  try {
    await ensureNoteTypeConfigs();
    return delegate.findMany({
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return defaultsAsRows();
  }
}
