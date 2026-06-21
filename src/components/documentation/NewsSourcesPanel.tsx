import type { DocsNewsSource } from "@/data/docs-news-sources";

function NewsSourceCard({ source }: { source: DocsNewsSource }) {
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-4 rounded-lg p-4 transition-colors hover:bg-white/5"
    >
      <span
        className="flex h-28 w-28 items-center justify-center rounded-lg border-2 border-white/20 bg-white/95 text-3xl font-bold text-investep-navy shadow-sm transition-transform group-hover:scale-105"
        aria-hidden
      >
        {source.label.charAt(0)}
      </span>
      <span className="rounded-md bg-[#d8c8e8] px-4 py-2 text-center text-sm font-bold uppercase tracking-wide text-black">
        {source.label}
      </span>
    </a>
  );
}

export function NewsSourcesPanel({ sources }: { sources: DocsNewsSource[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-investep-navy/20 bg-investep-navy text-white shadow-md">
      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 18px, currentColor 18px, currentColor 20px)",
          }}
        />
        <h2 className="relative text-center text-lg font-bold leading-snug sm:text-xl">
          ¿Cuáles son las páginas de noticias que utilizamos en Investep?
        </h2>
        <div className="relative mt-8 grid gap-6 sm:grid-cols-3">
          {sources.map((source) => (
            <NewsSourceCard key={source.href} source={source} />
          ))}
        </div>
      </div>
    </section>
  );
}
