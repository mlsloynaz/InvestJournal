type Props = {
  direction?: string | null;
  className?: string;
};

function normalizeDirection(direction?: string | null): "up" | "down" | null {
  const d = (direction ?? "").trim().toUpperCase();
  if (d === "CALL" || d === "UP") return "up";
  if (d === "PUT" || d === "DOWN") return "down";
  return null;
}

/** Green ↑ CALL / red ↓ PUT — shown when a strategy is fully met (Result Now only). */
export function StrategyMetDirectionArrow({ direction, className = "" }: Props) {
  const normalized = normalizeDirection(direction);
  if (normalized === "up") {
    return (
      <span
        className={`inline-flex items-center justify-center text-green-600 font-bold text-base leading-none ${className}`}
        aria-label="CALL — requisitos cumplidos"
        title="CALL — requisitos cumplidos"
      >
        ↑
      </span>
    );
  }
  if (normalized === "down") {
    return (
      <span
        className={`inline-flex items-center justify-center text-red-600 font-bold text-base leading-none ${className}`}
        aria-label="PUT — requisitos cumplidos"
        title="PUT — requisitos cumplidos"
      >
        ↓
      </span>
    );
  }
  return null;
}

/** Thick green ↑ / red ↓ for BB15 Movimientos -15M (up/down or CALL/PUT). */
export function Bb15DirectionArrow({
  direction,
  className = "",
}: Props) {
  const normalized = normalizeDirection(direction);
  if (normalized === "up") {
    return (
      <span
        className={`inline-flex items-center justify-center text-green-600 font-black text-xl leading-none ${className}`}
        aria-label="UP"
        title="UP"
      >
        ↑
      </span>
    );
  }
  if (normalized === "down") {
    return (
      <span
        className={`inline-flex items-center justify-center text-red-600 font-black text-xl leading-none ${className}`}
        aria-label="DOWN"
        title="DOWN"
      >
        ↓
      </span>
    );
  }
  return null;
}
