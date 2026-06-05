import Link from "next/link";
import { TOOLS_INDICADORES_PATH } from "@/lib/tools-paths";

export function AnalysisElementsBackLink() {
  return (
    <Link
      href={TOOLS_INDICADORES_PATH}
      className="text-sm text-investep-navy underline hover:no-underline"
    >
      ← Elementos de análisis
    </Link>
  );
}
