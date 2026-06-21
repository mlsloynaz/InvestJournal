type DatabaseSetupHintProps = {
  /** Shorter list for inline error panels (strategies, plan, etc.). */
  compact?: boolean;
  title?: string;
};

export function DatabaseSetupHint({
  compact = false,
  title = "InvestJournal",
}: DatabaseSetupHintProps) {
  return (
    <div className={compact ? "space-y-3" : "max-w-lg space-y-4"}>
      {!compact && <h1 className="text-2xl font-bold text-investep-navy">{title}</h1>}
      <p className="text-sm text-gray-700">
        La base de datos no esta disponible. Sigue estos pasos en PowerShell, desde la carpeta del
        proyecto:
      </p>
      <ol className="list-decimal list-inside text-sm space-y-2 text-gray-800">
        <li>
          <code className="bg-white px-1">npm run db:start</code> - inicia MySQL local en puerto{" "}
          <strong>3307</strong>
        </li>
        {!compact && (
          <>
            <li>
              Copia <code className="bg-white px-1">.env.example</code> a{" "}
              <code className="bg-white px-1">.env</code>
            </li>
            <li>
              <code className="bg-white px-1">npm install</code>
            </li>
          </>
        )}
        <li>
          <code className="bg-white px-1">npm run setup</code>{" "}
          {!compact && (
            <>
              (o <code className="bg-white px-1">npx prisma db push</code>)
            </>
          )}
        </li>
        {!compact && (
          <li>
            <code className="bg-white px-1">npm run dev</code>
          </li>
        )}
        {compact && (
          <li>
            Reinicia <code className="bg-white px-1">npm run dev</code>
          </li>
        )}
      </ol>
      <p className="text-xs text-gray-500">
        Requiere MySQL Server en el PC (p. ej.{" "}
        <code className="bg-white px-1">C:\Program Files\MySQL\MySQL Server 9.7\bin</code>
        ). Datos en <code className="bg-white px-1">mysql-data\</code>.
      </p>
    </div>
  );
}
