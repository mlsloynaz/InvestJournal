import Link from "next/link";

const items = [
  {
    href: "/config/aws",
    title: "FinanceAI — AWS",
    desc: "Alertas estrategia, jobs programados AWS y watchlist PRE/POST. Rangos óptimos e intervalos NOW en Tickers.",
  },
  {
    href: "/config/tickers",
    title: "Tickers",
    desc: "Rangos óptimos, Movimiento 15M, intervalos NOW y símbolos del journal",
  },
  {
    href: "/config/note-types",
    title: "Tipos de notas",
    desc: "Etiquetas para Nota, Predicción, Error",
  },
];

export default function ConfigPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">Configuración</h1>
        <p className="text-sm text-gray-600 mt-1">
          Datos maestros y opciones del journal.
        </p>
      </header>

      <section className="space-y-3">
        <ul className="grid sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block bg-white border rounded-lg p-4 hover:border-investep-gold transition-colors"
              >
                <h3 className="font-semibold text-investep-navy">{item.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
