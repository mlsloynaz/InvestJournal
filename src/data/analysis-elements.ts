export type AnalysisDiagramId =
  | "candle-anatomy"
  | "candle-types"
  | "bollinger"
  | "trend-line"
  | "trend-types"
  | "h-lines"
  | "premarket-bollinger";

export type AnalysisSection =
  | { type: "intro"; text: string }
  | { type: "callout"; title: string; text: string; variant?: "gold" | "navy" }
  | { type: "bullets"; title: string; items: string[] }
  | { type: "steps"; title: string; items: string[] }
  | { type: "table"; title: string; headers: string[]; rows: string[][] }
  | { type: "diagram"; title: string; diagram: AnalysisDiagramId }
  | {
      type: "cards";
      title: string;
      cards: { title: string; subtitle?: string; body: string; items?: string[] }[];
    };

export type AnalysisElement = {
  slug: string;
  title: string;
  weight: string | null;
  tagline: string;
  timeframes?: string;
  sections: AnalysisSection[];
};

export const ANALYSIS_ELEMENTS: AnalysisElement[] = [
  {
    slug: "temporalidades",
    title: "Temporalidades",
    weight: null,
    tagline: "Qué mirar en día, hora y 15 minutos — visión general.",
    sections: [
      {
        type: "intro",
        text: "Antes de entrar a una estrategia, revisa las temporalidades en orden. Cada estrategia detallará qué gráfico usar; aquí está la base común.",
      },
      {
        type: "callout",
        title: "Regla de anticipación",
        text: "15 minutos avisa lo que puede pasar en HORA. Hora avisa lo que puede pasar en DÍA. La temporalidad más grande tiene más peso en la decisión final.",
        variant: "gold",
      },
      {
        type: "table",
        title: "Configuración típica en TC2000",
        headers: ["Lado", "Temporalidad", "Indicador"],
        rows: [
          ["Izquierda", "Hora", "Medias móviles (20, 40, 100, 200)"],
          ["Derecha", "15 minutos", "Bandas de Bollinger"],
        ],
      },
      {
        type: "cards",
        title: "Resumen por temporalidad",
        cards: [
          {
            title: "Día",
            subtitle: "Mayor peso en la decisión",
            body: "Contexto principal de tendencia.",
            items: [
              "Confirmar alcista, bajista o lateral.",
              "Ver espacio para moverse (techos, pisos, volatilidad).",
              "Validar lo visto en hora y 15 min.",
              "Bollinger y medias mandan aquí.",
            ],
          },
          {
            title: "Hora",
            subtitle: "Puente entre detalle y contexto",
            body: "Confirmación antes de operar.",
            items: [
              "Confirmar dirección de tendencia.",
              "Marcar techos y pisos (medias, líneas de tendencia).",
              "Buscar confirmación en tiempo (rebotes, rupturas).",
              "Anticipar lo que el día puede confirmar o negar.",
            ],
          },
          {
            title: "15 minutos",
            subtitle: "Entrada fina · Bollinger",
            body: "Anticipación de la hora.",
            items: [
              "Precio dentro, expuesto o saliendo de Bollinger.",
              "Volatilidad abriéndose o cerrándose.",
              "Pre-market: ver si abre dentro o fuera de Bollinger.",
              "Medias no son el foco aquí.",
            ],
          },
        ],
      },
      {
        type: "steps",
        title: "Panorama completo antes de operar",
        items: [
          "Día — contexto y peso máximo.",
          "Hora — confirmación y techos/pisos.",
          "15 min — Bollinger fino.",
          "Velas — confirmación al entrar.",
          "Seguir monitoreando después de abrir: el mercado no queda estático.",
        ],
      },
      {
        type: "callout",
        title: "Próximo paso",
        text: "Usa el Checklist Pre-Market para el panorama completo paso a paso antes de las 9:30 AM. En cada estrategia verás qué condiciones deben cumplirse en día, hora y 15 min para esa operación concreta.",
        variant: "navy",
      },
    ],
  },
  {
    slug: "checklist-pre-market",
    title: "Checklist Pre-Market",
    weight: null,
    tagline: "Panorama completo paso a paso — 10 a 30 min antes de la apertura (9:30 AM EST).",
    sections: [
      {
        type: "intro",
        text: "El pre-market sirve para **anticipar** la apertura: tendencia, saltos y si el precio abrirá dentro o fuera de Bollinger. No operes antes de las 9:30 AM ni marques edge lines sobre la zona gris — esas líneas se borran al quitar el pre-market.",
      },
      {
        type: "callout",
        title: "Cuándo hacerlo",
        text: "Entre 10 y 30 minutos antes de la apertura, según tu ritmo. Anota fecha y ticker. Conoce de memoria el rango de precio de la compañía para comprar rápido cuando abra el mercado.",
        variant: "gold",
      },
      {
        type: "table",
        title: "Horarios del mercado (EST)",
        headers: ["Período", "Horario", "Para qué"],
        rows: [
          ["Mercado regular", "9:30 AM – 4:00 PM", "Operar"],
          ["After market", "4:00 PM – 8:00 PM", "Anticipar"],
          ["Pre-market / futuros", "4:00 AM – 9:30 AM", "Anticipar apertura"],
        ],
      },
      {
        type: "steps",
        title: "Paso 0 — Preparación",
        items: [
          "Anota la fecha y el ticker que vas a analizar.",
          "Verifica el rango de precio (óptimo, mínimo, máximo) — comprar fuera del rango es más lento y arriesgado.",
          "Abre TC2000 con la compañía y revisa día → hora → 15 min en orden.",
        ],
      },
      {
        type: "steps",
        title: "Paso 1 — Reunión FED",
        items: [
          "Consulta el calendario FOMC (Federal Reserve → News & Events → Calendar).",
          "Si hoy hay reunión FED (~cada 6 semanas, miércoles 2 PM): marca **no se cumple** para operar con normalidad.",
          "En día FED solo opera en la mañana si hay señales muy claras; si no, espera después de la noticia.",
          "Anota la próxima fecha si no es hoy.",
        ],
      },
      {
        type: "steps",
        title: "Paso 2 — Earnings",
        items: [
          "Busca la fecha del próximo earning de la compañía (Google: ticker + earnings date).",
          "Si hoy es earning (BO = before open, AMC = after close): **no se recomienda operar** — movimientos engañosos.",
          "En semana de earning o FED: la noticia mata la estrategia técnica.",
          "Post-earning suele dar mejores oportunidades que el día del reporte.",
        ],
      },
      {
        type: "steps",
        title: "Paso 3 — Bollinger (15 min, Hora y Día)",
        items: [
          "En **DÍA**: ¿el punto medio (MA 20) representa piso o techo de rebote? Si está lateral, no marca nada útil.",
          "En **HORA**: ¿precio dentro de Bollinger con espacio al punto medio, o expuesto/saliendo?",
          "En **15 MIN**: ¿volatilidad abriéndose o cerrada? Vela subiendo sin abrir volatilidad puede ser engañosa.",
          "Marca en tu checklist si el punto medio es rebote en cada temporalidad (✓ se cumple / ✗ no).",
          "Si el precio sube hacia punto medio bajista en día, Bollinger (50%) pesa más que medias alcistas.",
        ],
      },
      {
        type: "steps",
        title: "Paso 4 — Medias móviles (Hora y Día)",
        items: [
          "Identifica tendencia: 100/200 (largo), 40/20 (corto) — ¿alcista, bajista o cruce reciente?",
          "Marca el siguiente **piso** o **techo** (MA 20, 40, 100, 200) con color en el gráfico.",
          "Si el precio queda atrapado entre techos y pisos → panorama poco claro, mejor no operar.",
          "Mayor separación entre medias → rebotes más fuertes posibles.",
          "Anota qué media es continuidad vs. rebote según la dirección del precio.",
        ],
      },
      {
        type: "steps",
        title: "Paso 5 — Edge lines (H-Lines)",
        items: [
          "Marca los **2 edge lines más cercanos** (máximo y mínimo recientes) — en horario regular, no sobre pre-market.",
          "Incluye **1 ATH** y **1 ATL** como referencia histórica.",
          "Si el precio va hacia un edge line antiguo → más probabilidad de rebote.",
          "Si va hacia edge reciente → menos fuerza, pero puede respetarlo.",
          "Planifica: ¿necesita romper edge line + confirmación antes de llegar al siguiente nivel?",
        ],
      },
      {
        type: "steps",
        title: "Paso 6 — Línea de tendencia y salto (Gap)",
        items: [
          "Si tu estrategia es cambio de tendencia: traza la línea y anota si el salto la romperá al abrir.",
          "Salto al alza o baja = posible confirmación de ruptura (segundo salto suele seguir al primero).",
          "Sin salto que rompa la línea → espera vela de confirmación bajista/alcista en hora.",
          "Revisa también **cierre del día anterior** (20% peso) — suele respetarse más que la apertura.",
        ],
      },
      {
        type: "diagram",
        title: "Pre-market: ¿abre dentro o fuera de Bollinger?",
        diagram: "premarket-bollinger",
      },
      {
        type: "steps",
        title: "Cómo leer la apertura en TC2000 (pre-market)",
        items: [
          "En pre-market verás flechas verdes/rojas: indican el **salto** estimado (ej. +$0.85 al alza).",
          "Marca los puntos azules y traza una **línea horizontal en el punto medio** de las flechas.",
          "Imagina quitar la zona gris del pre-market: ¿dónde cae esa línea respecto a Bollinger en horario regular?",
          "Si cae **dentro** del canal → abrirá dentro de Bollinger.",
          "Si cae **expuesto o tocando el disipador** → abrirá fuera/expuesto — útil para estrategias de apertura con salto.",
        ],
      },
      {
        type: "table",
        title: "Resumen — ¿Se cumple?",
        headers: ["Requisito", "Revisar en pre-market"],
        rows: [
          ["FED / Earning", "¿Hoy hay noticia? → evitar o cautela"],
          ["Bollinger 15M, Hora, Día", "Rebotes, exposición, volatilidad"],
          ["Medias Hora y Día", "Tendencia, techos, pisos"],
          ["Ruptura línea de tendencia", "¿Salto o vela la confirma?"],
          ["Salto (Gap)", "Dirección y tamaño al abrir"],
          ["Cierre día anterior", "Nivel de rebote/resistencia"],
        ],
      },
      {
        type: "callout",
        title: "Noticia mata estrategia",
        text: "No operes en semana de earning ni en día de reunión FED salvo señales muy claras en la mañana. El movimiento queda sujeto a la noticia, no solo al técnico.",
        variant: "gold",
      },
      {
        type: "steps",
        title: "Al abrir el mercado (9:30 AM) — puntos 7 y 8",
        items: [
          "**Bid / Ask / Spread (VDSC):** solo con mercado abierto — precios pre-market no son reales para esto.",
          "Anota bid, ask y diferencia (spread). Lo normal varía por compañía ($1–$3 o más en algunas).",
          "**Distancia spot vs. strike:** verifica que el contrato en rango no quede demasiado lejos del spot (ej. 20 strikes = no comprar).",
          "Busca contratos **in range** y cerca del At The Money.",
          "Elige vencimiento: mismo día antes de 12 PM; después de 12 PM → vencimiento del día siguiente.",
        ],
      },
      {
        type: "bullets",
        title: "Después de abrir — seguir monitoreando",
        items: [
          "El checklist de la mañana no congela el mercado: sigue viendo tu compañía.",
          "Si en día abre volatilidad y en hora sale de Bollinger → 15 min puede intensificar el movimiento.",
          "Día pesa más que hora; hora pesa más que 15 min — el precio expuesto puede regresar.",
          "**No operar también es ganancia** si el panorama no está claro.",
        ],
      },
      {
        type: "callout",
        title: "Recuerda",
        text: "Pre-market anticipa; horario regular confirma. Edge lines y disipadores se marcan sin la zona gris. Estrategias de apertura fuera de Bollinger (lateral sin volatilidad) requieren este análisis antes de las 9:30 y entrada en los primeros 5 minutos.",
        variant: "navy",
      },
    ],
  },
  {
    slug: "medias-moviles",
    title: "Medias móviles",
    weight: "25%",
    tagline: "Tendencia, pisos y techos en hora y día.",
    timeframes: "Hora y Día",
    sections: [
      {
        type: "intro",
        text: "Promedio del cierre de las últimas X velas. Siempre se usan en pares. A mayor período, más peso tiene la media.",
      },
      {
        type: "bullets",
        title: "Pares que usamos",
        items: [
          "20 y 40 — tendencia de corto plazo.",
          "100 y 200 — tendencia de largo plazo.",
          "Semanal y mensual: solo informativo.",
        ],
      },
      {
        type: "cards",
        title: "Cómo leer la tendencia",
        cards: [
          {
            title: "Alcista",
            body: "20 sobre 40, ambas ascendentes en canal.",
            items: ["100 sobre 200 en canal alcista = largo plazo alcista."],
          },
          {
            title: "Bajista",
            body: "40 sobre 20, ambas descendentes.",
            items: ["100 bajo 200 en canal bajista."],
          },
          {
            title: "Lateral",
            body: "Medias entrelazadas o muy juntas.",
            items: ["Rebotes menos fiables. Cuidado al operar."],
          },
        ],
      },
      {
        type: "bullets",
        title: "Reglas clave",
        items: [
          "Mayor separación entre medias = tendencia más sana.",
          "Menor separación = tendencia débil o enferma.",
          "Alcista: medias actúan como pisos / soporte.",
          "Bajista: medias actúan como techos / resistencia.",
          "Primer rebote en una media suele ser el más fuerte; el 2.º, 3.º… pierde probabilidad.",
          "Si el precio rebota 3–4 veces en MA 20, pasa el foco a MA 40, y así sucesivamente.",
        ],
      },
      {
        type: "callout",
        title: "En hora y día",
        text: "En hora confirmas dirección y rebotes. En día validas la tendencia de fondo. En lateral, no fuerces lectura de medias como si fuera tendencia clara.",
        variant: "gold",
      },
    ],
  },
  {
    slug: "velas-japonesas",
    title: "Velas japonesas",
    weight: "15%",
    tagline: "Intención de compra o venta — confirmación del movimiento.",
    timeframes: "Todas (confirmación al entrar)",
    sections: [
      {
        type: "intro",
        text: "Muestran apertura, cierre, máximo y mínimo. El cuerpo va de apertura a cierre; las sombras marcan máximo y mínimo.",
      },
      {
        type: "callout",
        title: "Lo más importante",
        text: "El color NO define alcista o bajista. Importa si hay más presión de compra o de venta, y dónde cierra la vela respecto a su apertura.",
        variant: "gold",
      },
      {
        type: "diagram",
        title: "Anatomía de una vela",
        diagram: "candle-anatomy",
      },
      {
        type: "diagram",
        title: "Tipos de vela (referencia visual)",
        diagram: "candle-types",
      },
      {
        type: "table",
        title: "Tipos de vela",
        headers: ["Vela", "Señal"],
        rows: [
          ["Alcista fuerte (sin sombras)", "Confirmación de compra"],
          ["Bajista fuerte (sin sombras)", "Confirmación de venta"],
          ["Neutral", "No usar como confirmación"],
          ["Hanger (martillo invertido verde)", "Más intención de venta"],
        ],
      },
      {
        type: "bullets",
        title: "Reglas prácticas",
        items: [
          "Solo velas de confirmación claras — nunca neutrales.",
          "Velas extremas (cuerpo grande, sin sombras) = confirmación más fuerte.",
          "Velas alcistas suelen ir acompañadas de alcistas; bajistas con bajistas.",
          "Úsalas al final del análisis, cuando ya tienes contexto de día/hora/Bollinger.",
        ],
      },
    ],
  },
  {
    slug: "bollinger-bands",
    title: "Bollinger Bands",
    weight: "50%",
    tagline: "El elemento con más peso — tendencia, volatilidad y rebotes.",
    timeframes: "15 min, Hora y Día",
    sections: [
      {
        type: "intro",
        text: "Tres líneas: disipador superior, punto medio (MA 20) y disipador inferior. Usar configuración por defecto.",
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
            title: "Punto medio",
            subtitle: "MA 20",
            body: "Indica la tendencia.",
            items: [
              "Sube → alcista (actúa como piso al corregir).",
              "Baja → bajista (actúa como techo al subir).",
              "Plano → lateral (no es rebote confiable).",
            ],
          },
          {
            title: "Disipadores",
            subtitle: "Volatilidad",
            body: "Qué tan abierto o cerrado está el canal.",
            items: [
              "Cerrados = baja volatilidad, freno al movimiento.",
              "Abiertos = alta volatilidad, continuidad posible.",
              "La volatilidad es cíclica: alto → luego bajo, y viceversa.",
            ],
          },
          {
            title: "Precio vs. bandas",
            body: "El precio tiende a volver hacia los disipadores.",
            items: [
              "Dentro de Bollinger = esperar.",
              "Expuesto o saliendo = movimiento con intención.",
              "Más fuerte en temporalidades grandes.",
            ],
          },
        ],
      },
      {
        type: "bullets",
        title: "Por temporalidad",
        items: [
          "Día: peso máximo — punto medio y volatilidad mandan.",
          "Hora: confirmación de rebotes en punto medio.",
          "15 min: entrada fina; anticipa la hora. Pre-market para ver apertura dentro/fuera.",
        ],
      },
      {
        type: "callout",
        title: "Volatilidad real vs. falsa",
        text: "Alta volatilidad (disipadores abiertos) suele significar continuidad del movimiento. Baja volatilidad frena — un precio que se mueve sin que abran los disipadores es sospechoso. Opera donde hay volatilidad, salvo la estrategia documentada de salida de Bollinger en 15 min sin volatilidad al abrir el mercado.",
        variant: "gold",
      },
      {
        type: "table",
        title: "Señales de movimiento o volatilidad engañosa",
        headers: ["Lo que ves", "Por qué puede engañar"],
        rows: [
          [
            "Vela sube pero disipadores no abren",
            "Movimiento sin volatilidad real — puede revertirse",
          ],
          [
            "Volatilidad empieza a abrir pero el movimiento es débil",
            "No hay continuidad; el precio puede volver",
          ],
          [
            "Parece abrir volatilidad, solo un poco, y regresa",
            "Típico en lateral — ruptura falsa",
          ],
          [
            "Sale de Bollinger con fuerza y revierte en minutos",
            "Impulso que no se sostiene",
          ],
          [
            "Precio lento, poca volatilidad, rompe H-Line poco",
            "Puede tocar la línea y regresar (sobre todo si ya la respetó)",
          ],
          [
            "Tendencia lateral + punto medio horizontal",
            "El precio fluctúa entre disipadores; no es piso ni techo",
          ],
        ],
      },
      {
        type: "bullets",
        title: "Lateral — contexto traicionero",
        items: [
          "En lateral, lo que parece ruptura a menudo no lo es.",
          "Punto medio plano + disipadores cerrados: no tratar el medio como rebote.",
          "Movimientos rápidos que vuelven son frecuentes — mejor esperar salir de la lateralidad.",
          "No operar Bollinger como si hubiera tendencia clara cuando día/hora/15 min están laterales.",
        ],
      },
      {
        type: "steps",
        title: "Cuándo confiar más en el movimiento",
        items: [
          "Disipadores abiertos con fuerza en la temporalidad que manda (día > hora > 15 min).",
          "Tendencia definida — no lateral en las temporalidades clave.",
          "Precio sale de Bollinger y la volatilidad acompaña, sin revertir al instante.",
          "Confirmación con vela clara en hora (no neutra).",
          "Si el panorama es lateral: esperar ruptura de edge line o definición de medias antes de entrar.",
        ],
      },
      {
        type: "callout",
        title: "Recuerda",
        text: "Bollinger pesa 50%: en conflicto con una tendencia alcista/bajista en medias, el punto medio en día puede mandar como punto de rebote. Pero en lateral, tanto Bollinger como medias pueden engañar. Usa la vista Mejorada para el detalle de las clases I y II.",
        variant: "navy",
      },
    ],
  },
  {
    slug: "volumen",
    title: "Volumen",
    weight: "5%",
    tagline: "Apoyo — cuántas acciones se negocian.",
    timeframes: "Apoyo en todas",
    sections: [
      {
        type: "intro",
        text: "Muestra la cantidad de compra o venta en transacciones. Peso bajo (5%): nunca decide solo, complementa Bollinger y medias.",
      },
      {
        type: "table",
        title: "Volumen vs. volatilidad",
        headers: ["Situación", "Significado"],
        rows: [
          ["Volumen alto, volatilidad baja", "Pocas operaciones grandes (ej. 1 persona × 100 acciones)"],
          ["Volatilidad alta", "Muchas personas entrando y saliendo"],
        ],
      },
      {
        type: "callout",
        title: "En la práctica",
        text: "Nos guiamos más por volatilidad (participación del mercado) que por volumen aislado. Muchas personas moviendo el precio suele ser señal más relevante.",
        variant: "gold",
      },
    ],
  },
  {
    slug: "worden-stochastic",
    title: "Worden Stochastic",
    weight: "5%",
    tagline: "Apoyo — sobrecompra y sobreventa.",
    timeframes: "Apoyo en todas",
    sections: [
      {
        type: "intro",
        text: "Indica zonas de sobrecompra y sobreventa mediante el cruce de dos líneas. Peso 5%: señal auxiliar, no reemplaza Bollinger ni medias.",
      },
      {
        type: "bullets",
        title: "Qué mirar",
        items: [
          "Cruce de líneas hacia zona de sobreventa → posible rebote alcista.",
          "Cruce hacia sobrecompra → posible corrección.",
          "Usar junto con el panorama de día/hora, no en aislamiento.",
        ],
      },
      {
        type: "callout",
        title: "Nota",
        text: "En el curso básico se profundiza menos que en medias, velas y Bollinger. Enfócate primero en los tres elementos principales.",
        variant: "navy",
      },
    ],
  },
  {
    slug: "misc",
    title: "Misc — general",
    weight: null,
    tagline: "Líneas de tendencia, edge lines, ATH/ATL y marco del panorama completo.",
    sections: [
      {
        type: "intro",
        text: "Herramientas que no son un indicador con peso, pero sí marcan la estructura del gráfico. Úsalas junto con temporalidades, medias, Bollinger y velas.",
      },
      {
        type: "callout",
        title: "Panorama completo",
        text: "Ver en su totalidad: Bollinger, medias móviles, fases del mercado, edge lines, tendencia y velas de confirmación. Eso define si entras, esperas o refuerzas.",
        variant: "gold",
      },
      {
        type: "diagram",
        title: "Tipos de tendencia",
        diagram: "trend-types",
      },
      {
        type: "diagram",
        title: "Cómo trazar una línea de tendencia",
        diagram: "trend-line",
      },
      {
        type: "steps",
        title: "Pasos — línea de tendencia alcista",
        items: [
          "Identifica mínimos crecientes (impulsos y procesos en la temporalidad que operas).",
          "Traza la línea ligeramente por debajo del precio, tocando al menos 2–3 mínimos.",
          "En alcista: la línea va bajo los pisos; en bajista: sobre los techos.",
          "Si el precio la rompe con intención (vela de confirmación o salto), la tendencia puede estar cambiando.",
          "En lateral, la línea de tendencia pierde utilidad — espera salida de la lateralidad.",
        ],
      },
      {
        type: "steps",
        title: "Pasos — línea de tendencia bajista",
        items: [
          "Marca techos decrecientes en hora o día según tu operación.",
          "Une los máximos con una línea por encima del precio.",
          "Ruptura al alza + confirmación = posible cambio de bajista a alcista.",
          "Cruza con medias (20/40, 100/200) y Bollinger antes de decidir.",
        ],
      },
      {
        type: "diagram",
        title: "Edge lines (H-Lines)",
        diagram: "h-lines",
      },
      {
        type: "bullets",
        title: "Reglas — edge lines y máximos históricos",
        items: [
          "Marca solo los dos edge lines más cercanos al precio (máximo y mínimo recientes).",
          "Además: un ATH (All Time High) y un ATL (All Time Low) — solo uno de cada uno.",
          "A mayor tiempo sin visitar un H-Line → más probable el rebote al llegar.",
          "A mayor antigüedad del H-Line que el precio rompe → movimiento más fuerte posible.",
          "En ATH/ATL suele rebotar; si no rebota y rompe, busca nuevos máx/mín con fuerza.",
          "En pre-market/post-market las edge lines se borran — márcalas en horario regular.",
        ],
      },
      {
        type: "bullets",
        title: "Orden sugerido al analizar (día → hora → 15 min)",
        items: [
          "Día: punto medio Bollinger, tendencia, ATH/ATL, edge lines.",
          "Hora: medias, edge lines cercanas, línea de tendencia, confirmar dirección.",
          "15 min: Bollinger, velas de confirmación, ruptura de edge line antes de entrar.",
          "Si hay lateralidad, espera ruptura clara — movimientos rápidos suelen ser engañosos.",
        ],
      },
      {
        type: "table",
        title: "Niveles horizontales extra",
        headers: ["Nivel", "Peso aprox."],
        rows: [
          ["Cierre del día anterior", "20%"],
          ["Apertura del mismo día", "10%"],
        ],
      },
      {
        type: "callout",
        title: "Recuerda",
        text: "Precio, Bollinger y medias dictan la tendencia. En lateral no operes medias ni Bollinger como si fueran tendencia clara. Las líneas marcan techos, pisos y confirmación — no reemplazan el 50% de Bollinger.",
        variant: "navy",
      },
    ],
  },
];

export function listAnalysisElements(): AnalysisElement[] {
  return ANALYSIS_ELEMENTS;
}

export function getAnalysisElement(slug: string): AnalysisElement | undefined {
  return ANALYSIS_ELEMENTS.find((item) => item.slug === slug);
}

export function analysisElementPath(slug: string): string {
  return `/tools/documentation/indicadores/${slug}`;
}
