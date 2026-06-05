import { setTickerFavorite } from "@/server/actions/tickers";

type Props = {
  id: number;
  isFavorite: boolean;
};

export function TickerFavoriteToggle({ id, isFavorite }: Props) {
  return (
    <form action={setTickerFavorite} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="isFavorite" value={isFavorite ? "0" : "1"} />
      <button
        type="submit"
        title={isFavorite ? "Quitar de favoritos" : "Mostrar en el dashboard"}
        aria-pressed={isFavorite}
        className={
          isFavorite
            ? "!bg-investep-gold !text-investep-navy !border !border-investep-gold !px-2.5 !py-1 !text-xs !font-semibold hover:!bg-investep-gold/90 !shadow-none whitespace-nowrap"
            : "!bg-white !text-investep-navy !border !border-investep-navy/30 !px-2.5 !py-1 !text-xs !font-medium hover:!border-investep-gold hover:!text-investep-gold !shadow-none whitespace-nowrap"
        }
      >
        {isFavorite ? "★ Favorito" : "☆ Favorito"}
      </button>
    </form>
  );
}
