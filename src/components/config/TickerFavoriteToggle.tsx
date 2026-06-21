"use client";

import { useRouter } from "next/navigation";
import { useTransition, type MouseEvent } from "react";
import { toggleTickerFavorite } from "@/server/actions/tickers";

type Props = {
  id: number;
  isFavorite: boolean;
  compact?: boolean;
  disabled?: boolean;
  onToggled?: (isFavorite: boolean) => void;
};

export function TickerFavoriteToggle({
  id,
  isFavorite,
  compact,
  disabled,
  onToggled,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || pending) return;

    const nextFavorite = !isFavorite;
    startTransition(async () => {
      const result = await toggleTickerFavorite(id, nextFavorite);
      if (!result.success) return;
      onToggled?.(nextFavorite);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      title={isFavorite ? "Quitar de favoritos" : "Marcar favorito"}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Quitar favorito" : "Marcar favorito"}
      className={
        compact
          ? isFavorite
            ? "!bg-investep-gold !text-investep-navy !border !border-investep-gold !px-1.5 !py-0.5 !text-[10px] !font-semibold hover:!bg-investep-gold/90 !shadow-none disabled:opacity-50 shrink-0"
            : "!bg-white !text-investep-navy !border !border-investep-navy/25 !px-1.5 !py-0.5 !text-[10px] !font-medium hover:!border-investep-gold !shadow-none disabled:opacity-50 shrink-0"
          : isFavorite
            ? "!bg-investep-gold !text-investep-navy !border !border-investep-gold !px-2.5 !py-1 !text-xs !font-semibold hover:!bg-investep-gold/90 !shadow-none whitespace-nowrap disabled:opacity-50 shrink-0"
            : "!bg-white !text-investep-navy !border !border-investep-navy/30 !px-2.5 !py-1 !text-xs !font-medium hover:!border-investep-gold hover:!text-investep-gold !shadow-none whitespace-nowrap disabled:opacity-50 shrink-0"
      }
    >
      {pending ? "…" : compact ? (isFavorite ? "★" : "☆") : isFavorite ? "★ Favorito" : "☆ Favorito"}
    </button>
  );
}
