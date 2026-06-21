import {
  readStrategyCardGallery,
  rewriteStrategyDocAssetUrl,
  type StrategyCardGallery,
} from "@/lib/strategy-docs";

const SECTION_STYLE: Record<string, { border: string; badge: string }> = {
  si: { border: "border-green-600", badge: "bg-green-800" },
  senal: { border: "border-amber-500", badge: "bg-amber-700" },
  no: { border: "border-red-700", badge: "bg-red-800" },
};

export function StrategyDocCards({ gallery }: { gallery: StrategyCardGallery }) {
  return (
    <section className="bg-white border rounded-lg p-5 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-investep-navy">Tarjetas de la estrategia</h2>
        <p className="text-sm text-gray-600 mt-1">
          Verde = cumple requisitos · Ámbar = señal sin entrada · Rojo = no operar
        </p>
      </div>

      {gallery.sections.map((section) => {
        const style = SECTION_STYLE[section.key] ?? SECTION_STYLE.si;
        return (
          <div key={section.key} className="space-y-3">
            <h3 className={`text-sm font-semibold border-b-2 pb-1 inline-block ${style.border} text-investep-navy`}>
              {section.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {section.items.map((item) => (
                <figure
                  key={item.id}
                  className={`border-2 rounded-lg overflow-hidden bg-gray-50 ${style.border}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rewriteStrategyDocAssetUrl(item.file)}
                    alt={item.title}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </figure>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export async function StrategyDocCardsLoader({ slug }: { slug: string }) {
  const gallery = await readStrategyCardGallery(slug);
  if (!gallery) return null;
  return <StrategyDocCards gallery={gallery} />;
}
