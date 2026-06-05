import { getAnalysisTypeReport, getComplianceReport } from "@/server/actions/reports";

export default async function ReportsPage() {
  let compliance: Awaited<ReturnType<typeof getComplianceReport>> = [];
  let analysisTypes: Awaited<ReturnType<typeof getAnalysisTypeReport>> = [];

  try {
    [compliance, analysisTypes] = await Promise.all([
      getComplianceReport(),
      getAnalysisTypeReport(),
    ]);
  } catch {
    return <p className="text-sm text-red-700">Base de datos no disponible.</p>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold text-investep-navy">Reports</h1>

      <section>
        <h2 className="text-lg font-semibold mb-3">Cumplimiento checklist (reciente)</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Semana</th>
              <th>Cumple</th>
              <th>Evaluados</th>
              <th>%</th>
              <th>Ops</th>
              <th>P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {compliance.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-500">
                  Sin datos
                </td>
              </tr>
            )}
            {compliance.map((row, i) => (
              <tr key={i}>
                <td>{row.symbol}</td>
                <td>{row.weekStart}</td>
                <td>{row.met}</td>
                <td>{row.evaluated}</td>
                <td>{row.compliancePct != null ? `${row.compliancePct}%` : "—"}</td>
                <td>{row.tradeCount}</td>
                <td className={row.totalPnl >= 0 ? "met-yes" : "met-no"}>
                  ${row.totalPnl.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Análisis por tipo (global)</h2>
        <ul className="text-sm bg-white border rounded p-4 space-y-1">
          {analysisTypes.map((a) => (
            <li key={a.type}>
              {a.type}: {a._count._all}
            </li>
          ))}
          {analysisTypes.length === 0 && <li className="text-gray-500">Sin entradas</li>}
        </ul>
      </section>
    </div>
  );
}
