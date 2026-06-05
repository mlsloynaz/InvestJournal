import type { AnalysisElement, AnalysisSection } from "./analysis-elements";
import { getAnalysisElement } from "./analysis-elements";

export const BOLLINGER_BANDS_ENHANCED_TAGLINE =
  "El elemento con más peso — tendencia, volatilidad, rebotes y movimientos de salida (clases I y II).";

export const BOLLINGER_BANDS_ENHANCED_TIMEFRAMES =
  "15 min, Hora y Día (semanal/mensual: inversión largo plazo, casi nunca opciones)";

export const BOLLINGER_BANDS_ENHANCED_SECTIONS: AnalysisSection[] = [
  {
    type: "intro",
    text: "Bollinger representa ~50% del análisis técnico. Tres líneas: disipador superior, punto medio (MA 20 de Bollinger) y disipador inferior. Todo el canal (la mancha) es volatilidad. Nunca decidas solo por Bollinger: únelo con medias, velas, edge lines, tendencia y tu plan.",
  },
  {
    type: "callout",
    title: "Regla de oro",
    text: "No operes con una sola señal de Bollinger. El panorama completo (medias, velas, H-Lines, temporalidades) es lo que da probabilidad alta — no certeza absoluta.",
    variant: "gold",
  },
  {
    type: "diagram",
    title: "Estructura Bollinger",
    diagram: "bollinger",
  },
  {
    type: "cards",
    title: "Las tres piezas",
    cards: [
      {
        title: "Punto medio (.media)",
        subtitle: "MA 20 de Bollinger",
        body: "Es la misma MA 20 que ves en medias, pero aquí la llamamos .media para no confundir el análisis. Indica tendencia de Bollinger.",
        items: [
          "Inclinado a la derecha (sube) → tendencia alcista en Bollinger.",
          "Inclinado a la izquierda (baja) → tendencia bajista.",
          "Plano → lateral — no es piso ni techo confiable.",
          "Márcalo cada día antes o al abrir el mercado (color distinto a velas).",
        ],
      },
      {
        title: "Disipadores",
        subtitle: "Osciladores · volatilidad",
        body: "La mancha entre las líneas = volatilidad. Abiertos = alta/extrema; cerrados = baja o nula.",
        items: [
          "Cerrados → no operar (salvo estrategias específicas de apertura documentadas).",
          "Abiertos los dos lados → movimiento más fuerte si el punto medio confirma dirección.",
          "Volatilidad cíclica: baja → alta → baja, en las 3 temporalidades.",
          "Compara con tu historial: marca disipadores con trendline para ver qué tan abierto está.",
        ],
      },
      {
        title: "Precio vs. bandas",
        body: "El precio y el disipador se encuentran; no permanecen separados para siempre.",
        items: [
          "Dentro de Bollinger → esperar; precio suele ir hacia el disipador.",
          "Expuesto (lejos del disipador) → puede corregir hacia la banda.",
          "Abre dentro y cierra fuera → más probable que el disipador jale el precio.",
          "En 3 temporalidades expuesto → mayor probabilidad de regreso (no 100%).",
        ],
      },
    ],
  },
  {
    type: "table",
    title: "Peso por temporalidad (analogía del curso)",
    headers: ["Temporalidad", "Peso", "Rol"],
    rows: [
      ["Día", "El más fuerte (~130 kg)", "Manda rebotes en punto medio; estrategias de rebote en .media"],
      ["Hora", "Intermedio (~100 kg)", "Confirmación; resistencia/soporte en .media"],
      ["15 min", "El más rápido (~75 kg)", "Anticipa hora y día; entradas rápidas saliendo de Bollinger"],
      ["Semanal / mensual", "Largo plazo", "Casi no se usa para opciones intradía"],
    ],
  },
  {
    type: "callout",
    title: "Anticipación entre temporalidades",
    text: "15 min avisa lo que puede pasar en hora; hora avisa lo que puede pasar en día. Aunque el día aún no haya llegado al disipador, 15 min puede estar advirtiendo el acercamiento.",
    variant: "navy",
  },
  {
    type: "cards",
    title: "Tendencia del punto medio — las 3 únicas",
    cards: [
      {
        title: "Alcista",
        subtitle: "Punto medio subiendo",
        body: "Con precio ARRIBA del punto medio, .media actúa como piso (más fuerte en día).",
        items: [
          "Precio viene de arriba hacia .media → rebote posible (espera confirmación en hora).",
          "Precio viene de abajo rompiendo hacia arriba → continuidad, no rebote.",
          "Si medias dicen bajista pero Bollinger día está alcista → Bollinger (50%) puede mandar como piso.",
          "Primera visita al piso = mayor probabilidad; cada toque posterior pierde fuerza.",
        ],
      },
      {
        title: "Bajista",
        subtitle: "Punto medio bajando",
        body: "Con precio DEBAJO del punto medio, .media actúa como techo (más fuerte en día).",
        items: [
          "Precio viene de abajo hacia .media → rebote a la baja posible (confirmación en hora).",
          "Precio viene de arriba hacia abajo → continuidad bajista.",
          "Conflicto con medias alcistas: en día, .media bajista puede ser techo igualmente.",
          "Marca .media y espera vela de confirmación — no adivines el rebote.",
        ],
      },
      {
        title: "Lateral",
        subtitle: "Punto medio plano + disipadores cerrados",
        body: "Ni piso ni techo. El precio oscila entre disipadores sin fuerza clara.",
        items: [
          "Preferible NO operar hasta que los disipadores abran.",
          "Rupturas rápidas suelen ser falsas y vuelven al rango.",
          "Aplica igual en 15 min, hora y día.",
          "El mercado es cíclico: siempre vuelve alcista, bajista o lateral — solo esas tres.",
        ],
      },
    ],
  },
  {
    type: "bullets",
    title: "Punto medio en hora — mínimo 2 días",
    items: [
      "En hora, .media como rebote/resistencia necesita al menos ~2 días de tendencia marcada.",
      "En 15 min, .media casi no actúa como zona de resistencia fuerte para el precio.",
      "En día, marca .media con trendline o color (evita rojo/verde = confusión con velas).",
      "Estrategia intermedia: rebote en punto medio en temporalidad día (requiere confirmación en hora).",
    ],
  },
  {
    type: "table",
    title: "Precio expuesto al disipador",
    headers: ["Situación", "Qué implica"],
    rows: [
      ["Expuesto solo en 15 min", "~33% sube / ~33% baja / ~33% lateraliza — mucha incertidumbre"],
      ["Expuesto en 15 min + hora", "Sube la probabilidad de corrección hacia el disipador, sin certeza"],
      [
        "Expuesto en 15 min + hora + día",
        "Alta probabilidad de que el precio vuelva a tocar el disipador (80–90% en condiciones normales)",
      ],
      ["Expuesto arriba en las 3 TFs", "Buscar PUT hacia el disipador superior — no CALL"],
      ["Expuesto abajo en las 3 TFs", "Buscar CALL hacia el disipador inferior — no PUT"],
      ["Noticias (FED, earnings muy negativos)", "Puede NO regresar aunque esté expuesto en 3 temporalidades"],
      ["Disipador se fractura/cierra mientras sigue expuesto", "Señal de que el movimiento puede estar terminando"],
    ],
  },
  {
    type: "callout",
    title: "Precio expuesto — protección y ganancias",
    text: "Si ya tienes ganancia y el precio queda expuesto (sobre todo en 3 temporalidades), considera cerrar: puede volver al disipador. Si el disipador sigue muy abierto, el movimiento puede continuar; si se cierra o fractura, suele acabar el impulso. La confirmación en apertura fuerte a veces es el salto + exposición en 3 TFs, sin vela extra.",
    variant: "gold",
  },
  {
    type: "table",
    title: "Volatilidad — cuándo sí y cuándo no",
    headers: ["Estado", "Qué hacer"],
    rows: [
      ["Disipadores cerrados / volatilidad nula", "No operar — punto medio suele lateral"],
      ["Volatilidad alta (abiertos)", "Buscar movimiento con dirección del punto medio"],
      ["Volatilidad extrema (muy abiertos)", "Movimientos más fuertes; comparar con histórico"],
      ["Solo un disipador abre", "Movimiento posible, menor fuerza que ambos abiertos"],
      ["Ambos disipadores abren a la vez", "Movimiento más fuerte; dirección la marca .media"],
      ["Volatilidad abre y cierra rápido (fluctúa)", "Volatilidad falsa — no da fuerza al precio"],
      ["Precio sube pero disipadores no abren", "Movimiento engañoso — puede revertir"],
    ],
  },
  {
    type: "bullets",
    title: "Movimiento saliendo de Bollinger (15 min)",
    items: [
      "Ideal: precio dentro de Bollinger y los disipadores empiezan a abrir con fuerza — salida fulminante.",
      "Entradas pensadas en 15 min; puede ocurrir a cualquier hora del mercado abierto, no solo apertura.",
      "Rentabilidad típica del movimiento: ~10–15% (a veces más); en 15 min suele ser en segundos o pocos minutos.",
      "No existe minuto exacto de compra: observa volatilidad abierta + precio con fuerza + .media indica dirección.",
      "No compres si el precio ya está muy expuesto lejos del disipador (riesgo de corrección inmediata).",
      "Volatilidad en 3 temporalidades refuerza; con solo 15 min abierto puede bastar para movimiento rápido.",
    ],
  },
  {
    type: "steps",
    title: "Factores antes de entrar (salida de Bollinger)",
    items: [
      "Marca y compara disipadores con ejemplos de alta/extrema volatilidad de esa compañía.",
      "Confirma que AMBOS disipadores se abren (no solo fluctúan abrir/cerrar).",
      "Verifica que .media apunta hacia donde quieres operar (arriba = CALL, abajo = PUT).",
      "Precio sale con fuerza y volatilidad acompaña — no sube solo con canal cerrado.",
      "Si ya está expuesto lejos del disipador, espera corrección o busca el lado opuesto (regreso a banda).",
      "Cruza con medias, velas, edge lines y panorama completo.",
    ],
  },
  {
    type: "table",
    title: "Señales de movimiento o volatilidad engañosa",
    headers: ["Lo que ves", "Por qué puede engañar"],
    rows: [
      ["Vela sube pero disipadores no abren", "Movimiento sin volatilidad real — falso (curso: Apple/Meta ejemplos)"],
      ["Volatilidad abre y cierra en la misma vela (fluctúa)", "Volatilidad falsa — el precio no gana fuerza"],
      ["Parece abrir un poco y regresa al rango", "Típico en lateral — ruptura falsa"],
      ["Sale de Bollinger y revierte en la misma o siguiente vela", "Impulso sin sostenimiento; revisa si estaba expuesto"],
      ["PUT en subida con precio ya expuesto al disipador superior", "Puede borrar ganancias cuando el precio vuelve a la banda"],
      ["Tendencia lateral + punto medio horizontal", "Fluctúa entre disipadores; no es piso ni techo"],
    ],
  },
  {
    type: "bullets",
    title: "Ciclo de volatilidad (decorar)",
    items: [
      "Baja volatilidad → alta → baja → alta… en 15 min, hora y día.",
      "Tras periodo de volatilidad nula suele venir periodo de alta volatilidad.",
      "El movimiento termina cuando la volatilidad se cierra o fractura (se estrecha el canal).",
      "Si la volatilidad sigue abierta, el movimiento puede continuar aunque el precio esté expuesto.",
    ],
  },
  {
    type: "steps",
    title: "Cuándo confiar más en el movimiento",
    items: [
      "Disipadores abiertos con fuerza en la temporalidad que manda (día > hora > 15 min).",
      "Tendencia definida en .media — no lateral en las temporalidades clave.",
      "Precio sale de Bollinger y la volatilidad abre sin cerrar al instante.",
      "Confirmación con vela clara en hora cuando operas rebotes en .media (no neutra).",
      "Precio expuesto en 3 TFs alineado con tu dirección (PUT arriba / CALL abajo).",
      "Si el panorama es lateral: esperar ruptura real o que abran disipadores antes de entrar.",
    ],
  },
  {
    type: "callout",
    title: "Recuerda",
    text: "Bollinger pesa 50%: en conflicto con medias, .media en día puede mandar como rebote. En lateral, Bollinger y medias engañan. Practica marcando volatilidad y .media en histórico antes de operar en real con montos grandes. Parte 1 = punto medio y precio expuesto; parte 2 = volatilidad y salida de Bollinger.",
    variant: "navy",
  },
];

export function getBollingerBandsEnhancedElement(): AnalysisElement | undefined {
  const base = getAnalysisElement("bollinger-bands");
  if (!base) return undefined;
  return {
    ...base,
    tagline: BOLLINGER_BANDS_ENHANCED_TAGLINE,
    timeframes: BOLLINGER_BANDS_ENHANCED_TIMEFRAMES,
    sections: BOLLINGER_BANDS_ENHANCED_SECTIONS,
  };
}
