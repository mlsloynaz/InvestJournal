import fs from "fs";

const filePath = "C:/dta/strategies/strategyall.md";
let text = fs.readFileSync(filePath, "utf8");

const mermaid = `\`\`\`mermaid
flowchart TD
    F0[FASE 0: Checklist pre-market]
    KS{Kill switch?}
    STOP[STOP - ninguna estrategia]
    CL[Clasificar estado del mercado]
    BB15[BB15 ayer: lateral + squeeze?]
    HOR[HORA: tendencia >= 2 dias?]
    DIA[DIA: tendencia clara?]
    GAP[Apertura: tamano gap / dentro-fuera BB?]
    E04{E04: lateral BB15 + gap + 5 min?}
    E03{E03: trend + gap + 15m + vol Stoch?}
    E02{E02: rebote MA20 D?}
    E01{E01: cambio tendencia H?}
    MAT[Matriz resultados - elegir VERDE o esperar]

    F0 --> KS
    KS -->|Si| STOP
    KS -->|No| CL
    CL --> BB15
    CL --> HOR
    CL --> DIA
    CL --> GAP
    BB15 --> E04
    HOR --> E03
    HOR --> E01
    DIA --> E02
    E04 --> MAT
    E03 --> MAT
    E02 --> MAT
    E01 --> MAT
\`\`\``;

const pattern = /```\nFASE 0 [\s\S]*?Matriz de resultados[^\n]*\n```/;
if (!pattern.test(text)) {
  console.error("Pattern not found in strategyall.md");
  process.exit(1);
}

text = text.replace(pattern, mermaid);
fs.writeFileSync(filePath, text, "utf8");
console.log("Updated strategyall.md with mermaid flowchart");
