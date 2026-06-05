"use client";

export function PlanPrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="!bg-investep-gold !text-investep-navy !text-sm !px-3 !py-1.5"
    >
      Imprimir reporte
    </button>
  );
}
