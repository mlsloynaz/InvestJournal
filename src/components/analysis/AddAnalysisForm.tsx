"use client";

import { useState } from "react";
import { AnalysisType } from "@prisma/client";
import { addAnalysisEntry } from "@/server/actions/analysis";
import { noteTypeButtonColor } from "@/lib/note-type-ui";

const PREDICTION_TEMPLATE = `## Primera nota del día

**Sesgo:** Alcista | Bajista | Neutral
**Probabilidades:** Alcista __% | Bajista __% | Lateral __%

**Niveles clave:**
**Catalizadores hoy:**
**Plan:**
**Riesgo principal:**
`;

export type NoteTypeOption = {
  code: string;
  label: string;
  hint: string | null;
};

const FALLBACK_TYPES: NoteTypeOption[] = [
  { code: AnalysisType.NOTE, label: "Nota", hint: "Observación general del día" },
  { code: AnalysisType.PREDICTION, label: "Predicción", hint: "Sesgo y probabilidades" },
  { code: AnalysisType.MISTAKE, label: "Error", hint: "Qué salió mal" },
];

type Props = {
  tickerId: number;
  defaultDate: string;
  tickerWeekId?: number;
  symbol?: string;
  compact?: boolean;
  noteTypes?: NoteTypeOption[];
};

function asAnalysisType(code: string): AnalysisType {
  if (code === AnalysisType.PREDICTION || code === AnalysisType.MISTAKE) return code;
  return AnalysisType.NOTE;
}

export function AddAnalysisForm({
  tickerId,
  defaultDate,
  tickerWeekId,
  symbol,
  compact = false,
  noteTypes = FALLBACK_TYPES,
}: Props) {
  const options = noteTypes.length > 0 ? noteTypes : FALLBACK_TYPES;
  const [type, setType] = useState<AnalysisType>(asAnalysisType(options[0].code));
  const [body, setBody] = useState("");

  function onTypeChange(code: string) {
    const next = asAnalysisType(code);
    setType(next);
    if (next === AnalysisType.PREDICTION && !body.trim()) {
      setBody(PREDICTION_TEMPLATE);
    }
  }

  const selected = options.find((o) => asAnalysisType(o.code) === type);

  return (
    <form
      action={addAnalysisEntry}
      className={`bg-white border-2 border-investep-gold/50 rounded-lg space-y-4 ${
        compact ? "p-3" : "p-5"
      }`}
    >
      <input type="hidden" name="tickerId" value={tickerId} />
      <input type="hidden" name="type" value={type} />
      {tickerWeekId != null && (
        <input type="hidden" name="tickerWeekId" value={tickerWeekId} />
      )}

      {!compact && (
        <div className="rounded bg-investep-cream/80 px-3 py-2 text-sm text-investep-navy">
          <strong>Journal de análisis</strong> — cada entrada tiene un <strong>tipo</strong> y se
          guarda por fecha en orden cronológico.
          {symbol && (
            <span className="block mt-1 text-xs text-gray-600">Ticker: {symbol}</span>
          )}
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-investep-navy mb-2">Tipo de entrada *</p>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => onTypeChange(opt.code)}
              className={`px-3 py-2 rounded border-2 text-sm font-medium transition-colors ${noteTypeButtonColor(
                opt.code,
                asAnalysisType(opt.code) === type
              )}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">{selected?.hint}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm font-medium">
          Fecha
          <input
            type="date"
            name="entryDate"
            defaultValue={defaultDate}
            className="block mt-1"
          />
        </label>
      </div>

      <label className="text-sm block font-medium">
        Texto de la nota *
        <textarea
          name="body"
          rows={compact ? 5 : 8}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            type === AnalysisType.NOTE
              ? "Escribe tu observación del mercado para este ticker..."
              : type === AnalysisType.MISTAKE
                ? "Describe el error y qué harías distinto..."
                : "Pega aquí la predicción con sesgo y probabilidades..."
          }
          className="w-full mt-1 text-sm"
        />
      </label>

      {type === AnalysisType.PREDICTION && (
        <button
          type="button"
          className="!bg-transparent !text-investep-navy underline text-xs !p-0"
          onClick={() => setBody(PREDICTION_TEMPLATE)}
        >
          Insertar plantilla de predicción
        </button>
      )}

      <button type="submit" className="!bg-investep-gold !text-investep-navy font-semibold">
        Guardar nota
      </button>
    </form>
  );
}
