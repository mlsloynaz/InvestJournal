import Link from "next/link";
import type { DocsTile } from "@/data/docs-tiles";

export function DocsTileGrid({ tiles }: { tiles: DocsTile[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          className="block bg-white border-2 border-investep-navy/15 rounded-lg p-5 hover:border-investep-gold hover:shadow-md transition-colors"
        >
          <h2 className="text-lg font-bold text-investep-navy">{tile.title}</h2>
          <p className="text-sm text-gray-600 mt-2">{tile.description}</p>
          <span className="inline-block mt-4 text-sm font-medium text-investep-navy underline">
            Abrir →
          </span>
        </Link>
      ))}
    </div>
  );
}
