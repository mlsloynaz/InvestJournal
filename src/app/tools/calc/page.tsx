import { PriceCalc } from "@/components/checklist/PriceCalc";

export default function ToolsCalcPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-investep-navy">Calc</h1>
        <p className="text-sm text-gray-600 mt-1">
          Calculadora de precio — 35% y 10%
        </p>
      </header>
      <PriceCalc />
    </div>
  );
}
