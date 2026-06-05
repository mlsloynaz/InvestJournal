import Link from "next/link";

const items = [
  {
    href: "/config/tickers",
    title: "Tickers",
    desc: "Símbolos que sigues en el journal",
  },
  {
    href: "/config/fed-meetings",
    title: "Fed meetings",
    desc: "Fechas de reuniones FED (~cada 45 días)",
  },
  {
    href: "/config/note-types",
    title: "Tipos de notas",
    desc: "Etiquetas para Nota, Predicción, Error",
  },
];

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">Configuración</h1>
        <p className="text-sm text-gray-600 mt-1">
          Datos maestros y opciones del journal.
        </p>
      </header>
      <ul className="grid sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block bg-white border rounded-lg p-4 hover:border-investep-gold transition-colors"
            >
              <h2 className="font-semibold text-investep-navy">{item.title}</h2>
              <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
