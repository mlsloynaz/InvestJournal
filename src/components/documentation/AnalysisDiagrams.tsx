import type React from "react";

type CandleProps = {
  open: number;
  close: number;
  high: number;
  low: number;
  fill: string;
  stroke: string;
  x: number;
  width?: number;
};

function Candle({ open, close, high, low, fill, stroke, x, width = 28 }: CandleProps) {
  const bodyTop = Math.min(open, close);
  const bodyBottom = Math.max(open, close);
  const bodyHeight = Math.max(bodyBottom - bodyTop, 2);

  return (
    <g>
      <line x1={x + width / 2} y1={high} x2={x + width / 2} y2={low} stroke={stroke} strokeWidth={2} />
      <rect
        x={x}
        y={bodyTop}
        width={width}
        height={bodyHeight}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        rx={1}
      />
    </g>
  );
}

export function CandleAnatomyDiagram() {
  const scale = (v: number) => 180 - v * 3;
  const x = 80;
  const open = scale(28);
  const close = scale(12);
  const high = scale(8);
  const low = scale(38);

  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-md mx-auto" role="img" aria-label="Anatomía vela japonesa">
      <Candle open={open} close={close} high={high} low={low} fill="#22c55e" stroke="#166534" x={x} width={36} />
      <text x={x + 18} y={high - 8} textAnchor="middle" className="fill-investep-navy text-[11px] font-semibold">
        Máximo
      </text>
      <text x={x + 52} y={open + 4} className="fill-gray-600 text-[10px]">
        Apertura
      </text>
      <text x={x + 52} y={close + 4} className="fill-gray-600 text-[10px]">
        Cierre
      </text>
      <text x={x + 18} y={low + 16} textAnchor="middle" className="fill-investep-navy text-[11px] font-semibold">
        Mínimo
      </text>
      <text x={x + 18} y={100} textAnchor="middle" className="fill-gray-500 text-[10px]">
        Cuerpo
      </text>
    </svg>
  );
}

export function CandleTypesDiagram() {
  const yBase = 40;
  const h = (v: number) => yBase + (40 - v) * 2.2;

  const candles = [
    { label: "Alcista fuerte", open: h(10), close: h(38), high: h(42), low: h(8), fill: "#22c55e", stroke: "#166534" },
    { label: "Bajista fuerte", open: h(38), close: h(10), high: h(42), low: h(8), fill: "#ef4444", stroke: "#991b1b" },
    { label: "Neutral", open: h(22), close: h(24), high: h(40), low: h(12), fill: "#94a3b8", stroke: "#475569" },
    { label: "Confirmación", open: h(8), close: h(40), high: h(40), low: h(8), fill: "#16a34a", stroke: "#14532d" },
  ];

  return (
    <svg viewBox="0 0 400 120" className="w-full" role="img" aria-label="Tipos de velas japonesas">
      {candles.map((c, i) => (
        <g key={c.label} transform={`translate(${20 + i * 95}, 0)`}>
          <Candle open={c.open} close={c.close} high={c.high} low={c.low} fill={c.fill} stroke={c.stroke} x={20} width={24} />
          <text x={32} y={110} textAnchor="middle" className="fill-investep-navy text-[9px] font-medium">
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function BollingerDiagram() {
  return (
    <svg viewBox="0 0 360 160" className="w-full max-w-lg mx-auto" role="img" aria-label="Bandas de Bollinger">
      <path
        d="M 20 45 Q 100 35, 180 50 T 340 40"
        fill="none"
        stroke="#ca8a04"
        strokeWidth={2}
        strokeDasharray="4 3"
      />
      <path d="M 20 80 Q 100 70, 180 85 T 340 75" fill="none" stroke="#0f2744" strokeWidth={2.5} />
      <path
        d="M 20 115 Q 100 105, 180 120 T 340 110"
        fill="none"
        stroke="#ca8a04"
        strokeWidth={2}
        strokeDasharray="4 3"
      />
      <polyline
        points="40,95 80,88 120,92 160,78 200,82 240,70 280,75 320,68"
        fill="none"
        stroke="#2563eb"
        strokeWidth={2}
      />
      <text x="300" y="38" className="fill-amber-700 text-[10px] font-semibold">
        Disipador superior
      </text>
      <text x="300" y="73" className="fill-investep-navy text-[10px] font-semibold">
        Punto medio (MA 20)
      </text>
      <text x="300" y="108" className="fill-amber-700 text-[10px] font-semibold">
        Disipador inferior
      </text>
      <text x="40" y="150" className="fill-blue-600 text-[10px]">
        Precio
      </text>
    </svg>
  );
}

export function TrendLineDiagram() {
  return (
    <svg viewBox="0 0 360 180" className="w-full max-w-lg mx-auto" role="img" aria-label="Línea de tendencia alcista">
      <polyline
        points="30,140 70,120 110,100 150,85 190,70 230,55 270,45 310,35"
        fill="none"
        stroke="#2563eb"
        strokeWidth={2}
      />
      <line x1="50" y1="155" x2="320" y2="55" stroke="#0f2744" strokeWidth={2.5} />
      <circle cx="70" cy="120" r="4" fill="#22c55e" />
      <circle cx="150" cy="85" r="4" fill="#22c55e" />
      <circle cx="230" cy="55" r="4" fill="#22c55e" />
      <text x="40" y="170" className="fill-investep-navy text-[10px] font-semibold">
        Tendencia alcista: línea bajo los mínimos crecientes
      </text>
      <text x="240" y="170" className="fill-gray-600 text-[9px]">
        Ruptura = posible cambio
      </text>
    </svg>
  );
}

export function TrendTypesDiagram() {
  return (
    <svg viewBox="0 0 360 140" className="w-full" role="img" aria-label="Tipos de tendencia">
      <polyline points="20,100 100,70 180,45" fill="none" stroke="#22c55e" strokeWidth={2.5} />
      <text x="20" y="120" className="fill-green-800 text-[10px] font-semibold">
        Alcista
      </text>
      <polyline points="20,40 100,70 180,95" fill="none" stroke="#ef4444" strokeWidth={2.5} />
      <text x="20" y="115" className="fill-red-800 text-[10px] font-semibold">
        Bajista
      </text>
      <polyline points="220,50 260,65 300,50 340,65" fill="none" stroke="#64748b" strokeWidth={2.5} />
      <text x="220" y="90" className="fill-gray-600 text-[10px] font-semibold">
        Lateral (engañosa)
      </text>
    </svg>
  );
}

export function HLineDiagram() {
  return (
    <svg viewBox="0 0 360 170" className="w-full max-w-lg mx-auto" role="img" aria-label="Edge lines H-Line">
      <line x1="20" y1="35" x2="340" y2="35" stroke="#ca8a04" strokeWidth={2} strokeDasharray="6 4" />
      <text x="24" y="28" className="fill-amber-800 text-[10px] font-semibold">
        Máximo reciente (Edge / H-Line)
      </text>
      <line x1="20" y1="130" x2="340" y2="130" stroke="#ca8a04" strokeWidth={2} strokeDasharray="6 4" />
      <text x="24" y="148" className="fill-amber-800 text-[10px] font-semibold">
        Mínimo reciente
      </text>
      <line x1="20" y1="12" x2="340" y2="12" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="2 4" />
      <text x="240" y="10" className="fill-gray-500 text-[9px]">
        ATH (máx. histórico) — solo uno
      </text>
      <polyline
        points="40,100 90,80 130,95 170,60 210,75 250,50 290,70"
        fill="none"
        stroke="#2563eb"
        strokeWidth={2}
      />
      <text x="24" y="165" className="fill-gray-600 text-[9px]">
        Marca solo los 2 edge lines más cercanos al precio + 1 ATH y 1 ATL
      </text>
    </svg>
  );
}

export function PremarketBollingerDiagram() {
  return (
    <svg viewBox="0 0 400 200" className="w-full max-w-xl mx-auto" role="img" aria-label="Pre-market dentro o fuera de Bollinger">
      <rect x="0" y="20" width="140" height="150" fill="#e2e8f0" opacity={0.6} />
      <text x="70" y="15" textAnchor="middle" className="fill-gray-600 text-[9px] font-semibold">
        Pre-market (zona gris)
      </text>
      <rect x="140" y="20" width="260" height="150" fill="#f8fafc" />
      <text x="270" y="15" textAnchor="middle" className="fill-investep-navy text-[9px] font-semibold">
        Horario regular 9:30+
      </text>
      <line x1="140" y1="20" x2="140" y2="170" stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" />
      <path d="M 150 55 Q 220 50, 290 58 T 390 52" fill="none" stroke="#ca8a04" strokeWidth={2} strokeDasharray="4 3" />
      <text x="350" y="48" className="fill-amber-700 text-[8px]">
        Disipador
      </text>
      <path d="M 150 95 Q 220 90, 290 98 T 390 92" fill="none" stroke="#0f2744" strokeWidth={2} />
      <text x="350" y="88" className="fill-investep-navy text-[8px]">
        Punto medio
      </text>
      <path d="M 150 135 Q 220 130, 290 138 T 390 132" fill="none" stroke="#ca8a04" strokeWidth={2} strokeDasharray="4 3" />
      <line x1="30" y1="75" x2="120" y2="75" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 3" />
      <text x="75" y="68" textAnchor="middle" className="fill-blue-600 text-[8px]">
        Línea en punto medio de flechas
      </text>
      <polygon points="55,85 50,95 60,95" fill="#22c55e" />
      <text x="65" y="100" className="fill-green-700 text-[8px]">
        +$0.85
      </text>
      <circle cx="55" cy="75" r="3" fill="#3b82f6" />
      <circle cx="95" cy="75" r="3" fill="#3b82f6" />
      <polyline points="160,110 200,105 240,100 280,95" fill="none" stroke="#2563eb" strokeWidth={2} />
      <text x="200" y="185" textAnchor="middle" className="fill-gray-700 text-[9px]">
        Si la línea cae expuesta al disipador → abre fuera · Si cae dentro del canal → abre dentro
      </text>
    </svg>
  );
}

export type AnalysisDiagramId =
  | "candle-anatomy"
  | "candle-types"
  | "bollinger"
  | "trend-line"
  | "trend-types"
  | "h-lines"
  | "premarket-bollinger";

const DIAGRAMS: Record<AnalysisDiagramId, () => React.ReactElement> = {
  "candle-anatomy": CandleAnatomyDiagram,
  "candle-types": CandleTypesDiagram,
  bollinger: BollingerDiagram,
  "trend-line": TrendLineDiagram,
  "trend-types": TrendTypesDiagram,
  "h-lines": HLineDiagram,
  "premarket-bollinger": PremarketBollingerDiagram,
};

export function AnalysisDiagram({ id }: { id: AnalysisDiagramId }) {
  const Component = DIAGRAMS[id];
  return (
    <div className="bg-white border border-investep-navy/15 rounded-lg p-4">
      <Component />
    </div>
  );
}
