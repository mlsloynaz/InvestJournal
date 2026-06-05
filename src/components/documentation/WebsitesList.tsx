import type { DocumentationWebsite } from "@/data/documentation-websites";

function WebsiteCard({ site }: { site: DocumentationWebsite }) {
  return (
    <article className="space-y-2">
      <a
        href={site.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-base font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
      >
        {site.label}
      </a>
      <ul className="list-none m-0 p-0 space-y-0.5 text-sm text-gray-800">
        {site.uses.map((use) => (
          <li key={use}>{use}</li>
        ))}
      </ul>
    </article>
  );
}

export function WebsitesList({ columns }: { columns: DocumentationWebsite[][] }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {columns.map((column, colIndex) => (
        <div key={colIndex} className="space-y-8">
          {column.map((site) => (
            <WebsiteCard key={site.href} site={site} />
          ))}
        </div>
      ))}
    </div>
  );
}
