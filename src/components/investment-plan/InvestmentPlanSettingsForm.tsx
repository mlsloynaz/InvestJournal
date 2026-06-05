"use client";

import { useState } from "react";
import { updateInvestmentPlanConfig } from "@/server/actions/investment-plan";

type Props = {
  dailyInvestPercent: number;
};

export function InvestmentPlanSettingsForm({ dailyInvestPercent }: Props) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <section className="bg-white border border-investep-navy/15 rounded-lg px-4 py-3 print:hidden">
        <div className="flex flex-wrap justify-between gap-2 items-center">
          <p className="text-sm text-gray-800">
            <span className="text-xs uppercase tracking-wide text-gray-500 mr-2">
              Configuración del plan
            </span>
            Inversión por período:{" "}
            <strong className="text-investep-navy">{dailyInvestPercent}%</strong> del capital
            vigente
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="!bg-transparent !text-investep-navy underline text-xs !p-0"
          >
            Editar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border-2 border-investep-gold/40 rounded-lg p-4 space-y-3 print:hidden">
      <h2 className="text-sm font-semibold text-investep-navy uppercase tracking-wide">
        Configuración del plan
      </h2>
      <form action={updateInvestmentPlanConfig} className="flex flex-wrap gap-4 items-end">
        <label className="text-sm min-w-[200px]">
          % del capital a invertir cada período
          <input
            type="number"
            name="dailyInvestPercent"
            step="0.01"
            min="0.01"
            max="100"
            required
            defaultValue={dailyInvestPercent}
            className="w-full mt-1"
          />
        </label>
        <button type="submit">Guardar</button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="!bg-transparent !text-gray-600 underline text-sm !px-0"
        >
          Cancelar
        </button>
      </form>
    </section>
  );
}
