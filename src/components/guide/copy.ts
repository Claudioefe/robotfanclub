// Text of the public /guide page in both languages. Markup inside strings: **bold**, [[pink]], ~~lime italic~~.
export type Lang = "en" | "es";
export const LANGS: Lang[] = ["en", "es"];
export const DEFAULT_LANG: Lang = "en";

/** Anything other than a known language falls back to English. */
export function parseLang(value: string | string[] | undefined): Lang {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "es" ? "es" : DEFAULT_LANG;
}

type Pair = [string, string];
export interface Copy {
  htmlLang: string;
  meta: { title: string; description: string };
  home: string;
  signIn: string;
  langLabel: string;
  toc: string;
  eyebrow: string;
  h1: string;
  lead: string;
  sections: Pair[]; // id, label
  problem: { eyebrow: string; title: string; p1: string; p2: string; s1: Pair; s2: Pair };
  who: { eyebrow: string; title: string; cards: Pair[]; note: string };
  citations: { eyebrow: string; title: string; steps: Pair[]; targetsLabel: string; floor: string; target: string; bonus: string; bullets: string[] };
  top10: { eyebrow: string; title: string; p: string; organicLabel: string; upTo: string; aiLabel: string; aiText: string; bullets: string[]; exampleLabel: string; days: Pair[] };
  speed: { eyebrow: string; title: string; p: string; bullets: string[] };
  queries: { eyebrow: string; title: string; p1: string; bullets: string[]; p2: string };
  cited: { eyebrow: string; title: string; p1: string; cards: Pair[]; p2: string };
  limits: { eyebrow: string; title: string; bullets: string[] };
  next: { eyebrow: string; title: string; p: string; bullets: string[]; note: string };
  glossary: { eyebrow: string; terms: Pair[] };
  cta: { text: string; button: string };
  footer: string;
}

const en: Copy = {
  htmlLang: "en",
  meta: {
    title: "How it works · Robot Fan Club",
    description: "What Robot Fan Club measures, what counts as a citation, the 30% rule outside the top 10, how queries are chosen and what it takes for AI to cite you.",
  },
  home: "← Home",
  signIn: "Sign in",
  langLabel: "Language",
  toc: "On this page",
  eyebrow: "How it works",
  h1: "Proof the robots ~~picked you~~.",
  lead: "Robot Fan Club checks every day whether Google’s AI answers cite your pages, and how fast your site responds when someone taps it. This page explains, in plain words, what is measured, how it is counted and what it takes to win.",
  sections: [
    ["problem", "The problem"],
    ["who", "Who does what"],
    ["citations", "AI citations"],
    ["top10", "The 30% rule"],
    ["speed", "Speed"],
    ["queries", "Choosing queries"],
    ["cited", "Getting cited"],
    ["limits", "Honest limits"],
    ["next", "What’s next"],
  ],
  problem: {
    eyebrow: "The problem",
    title: "Google now answers first. And it [[cites]] its sources.",
    p1: "When someone searches, above the usual results there is more and more often an **AI-written answer** (AI Overview, or AI Mode when the person keeps the conversation going). That answer links to the pages it took the information from.",
    p2: "If your page is one of those sources, the person sees you before anyone else. If not, they see your competitors. A classic ranking report says nothing about this.",
    s1: ["Service 1 · AIO Pro", "Do Google’s AI answers cite your pages?"],
    s2: ["Service 2 · INP Sprint", "Does your site respond fast when someone taps it?"],
  },
  who: {
    eyebrow: "Who does what",
    title: "The platform measures. People improve.",
    cards: [
      ["The platform", "Measures every day, keeps the evidence and shows it in a private portal per client."],
      ["The team", "Chooses what to measure, reads the results and improves the content and the site."],
      ["The client", "Opens their read-only portal and approves the changes."],
    ],
    note: "The platform does not improve anything on its own. Today, choosing what to measure is also a human decision: see “Choosing queries”.",
  },
  citations: {
    eyebrow: "AI citations · AIO Pro",
    title: "Freeze the list. Check every day. Count your fans.",
    steps: [
      ["Freeze the list", "Up to 60 queries, locked for 60 days. A frozen list is never edited, so the measurement stays fair and comparable."],
      ["Check daily", "Same hour, every day, always under the same conditions: US, English, mobile. The raw result of every check is saved."],
      ["Count citations", "A query counts once, the first time a page of yours is among the AI answer’s sources inside the window."],
    ],
    targetsLabel: "The targets, per 60-day window",
    floor: "floor 12",
    target: "target 18",
    bonus: "bonus 25",
    bullets: [
      "Floor **12**, target **18**, bonus **25** citations per 60-day window.",
      "Under 12 on day 60? **20% of the fee comes back as credit** (credit, not a refund).",
      "The **citation rate** is always on screen: of all the checks where Google answered with AI, the share where you were picked.",
    ],
  },
  top10: {
    eyebrow: "The 30% rule",
    title: "A citation from outside the top 10 is the real proof.",
    p: "For each query Google also shows the usual 10 organic results. A citation is **off-top10** when the cited page was not among those 10 results that same day (compared by the page’s exact address, not by site). At least **30% of the citations** must be off-top10.",
    organicLabel: "Organic results · same query, same day",
    upTo: "… up to 10",
    aiLabel: "AI answer · sources",
    aiText: "The AI cited you from position 34. That is **off-top10**: it picked you for your content, not because you were already first.",
    bullets: ["It proves the AI chose you for what your page says, not only because Google already ranked you first.", "It avoids counting citations a client would have received anyway."],
    exampleLabel: "One query, 60 days",
    days: [
      ["Day 12", "Google answers with AI and cites your page. The query becomes **one citation**."],
      ["Day 13+", "It keeps citing you. It does **not** add another citation, but the citation rate goes up."],
      ["Day 60", "14 citations, 5 of them off-top10 (36%): the floor and the 30% rule are met."],
    ],
  },
  speed: {
    eyebrow: "Speed · INP Sprint",
    title: "Fast when it counts: when someone taps.",
    p: "**INP** (Interaction to Next Paint) is how long the site takes to react when someone taps, clicks or types. Google uses it as an experience signal.",
    bullets: [
      "Measured **on mobile**, with real visitors (a small script on the site) and with Google’s public field data (CrUX).",
      "Goal: INP p75 at or under **200 ms**, held for **two full 28-day windows** after the work ships.",
      "Third-party scripts the client decides to keep (for example a consent banner) sit **outside the guarantee**. Tag Bouncer lets the client decide which scripts get in.",
    ],
  },
  queries: {
    eyebrow: "Choosing queries",
    title: "The most important decision is made by a person, today.",
    p1: "The result depends on which queries are measured. Today the team picks the list and loads it by hand in the Admin. A good list has:",
    bullets: [
      "**Searches that bring customers**, not just the most popular ones: real buying or research intent.",
      "**Questions and long tail** (“how to choose…”, “best X for Y”), which trigger AI answers most.",
      "**Queries where you have a real chance.** A new site against giants will hardly reach 12 citations.",
      "Each one can be **improved with a specific page**.",
    ],
    p2: "Ideas come from the client’s Search Console (queries with impressions and position 4 to 20, questions and long tail), from the questions Google already ties to the domain, and from what the client wants to win. Today Search Console is exported and pasted by hand: there is no automatic connection.",
  },
  cited: {
    eyebrow: "Getting cited",
    title: "What it takes for the robots to pick you.",
    p1: "The platform does not do this part; the team does. According to Google, there is no special markup for AI: SEO fundamentals apply.",
    cards: [
      ["Indexed and eligible", "A page that is not indexed, or cannot show a snippet, cannot be cited."],
      ["One page per query", "Answer the question directly: a clear answer up front, clean headings, concrete facts."],
      ["Authority and trust", "Structured data where it fits, mentions and reviews."],
      ["A fast site", "Good INP makes every visit better, including the ones the AI sends."],
    ],
    p2: "The portal shows where to work: the **gap** view lists the queries where the AI answers but cites others, and whom. If a query starts citing you after a change, you see it.",
  },
  limits: {
    eyebrow: "Honest limits",
    title: "What this is not.",
    bullets: [
      "**It does not promise positions or specific citations.** It measures, and gives a defined guarantee: a floor of 12, or credit.",
      "**It does not cover ChatGPT or other AIs in the guarantee.** That part is an informational module, with its date, outside the SLA.",
      "**It does not index pages or fix the site.** It measures; the work is the team’s.",
    ],
  },
  next: {
    eyebrow: "What’s next",
    title: "An AI advisor. Not built yet.",
    p: "Choosing queries and deciding what to improve depends on the team’s experience. The plan is an AI layer that advises, always with a person reviewing:",
    bullets: [
      "**Propose what to measure,** from real data, with the reason for each query.",
      "**Explain why you are not cited,** by comparing the AI answer, the cited pages and yours.",
      "**Recommend content improvements** per page.",
      "**Close the loop:** see whether the query started citing you after the change.",
    ],
    note: "This is an intention, not a feature yet.",
  },
  glossary: {
    eyebrow: "Glossary",
    terms: [
      ["AI Overview / AI Mode", "Google’s AI answers, with cited sources."],
      ["Query", "A specific search that is measured."],
      ["Frozen list", "The fixed queries for 60 days."],
      ["Citation", "A query where a page of yours appears among the sources, at least once in the window."],
      ["Off-top10", "A citation from a page that was not in that query’s organic top 10 that day."],
      ["Citation rate", "% of AI answers in which you were cited."],
      ["Snapshot", "The raw result of a check, kept as evidence."],
      ["INP / CrUX", "Interaction speed / Google’s public real-user data."],
      ["Credit", "20% of the fee if day 60 ends below 12 citations."],
    ],
  },
  cta: { text: "Ready to make the robots your biggest fans?", button: "Start a fan club" },
  footer: "Measured in the US · English · mobile · same hour daily",
};

const es: Copy = {
  htmlLang: "es",
  meta: {
    title: "Cómo funciona · Robot Fan Club",
    description: "Qué mide Robot Fan Club, qué cuenta como cita, la regla del 30% fuera del top 10, cómo se eligen las queries y qué hace falta para que la IA te cite.",
  },
  home: "← Inicio",
  signIn: "Iniciar sesión",
  langLabel: "Idioma",
  toc: "En esta página",
  eyebrow: "Cómo funciona",
  h1: "La prueba de que los robots ~~te eligieron~~.",
  lead: "Robot Fan Club revisa todos los días si las respuestas de IA de Google citan tus páginas, y qué tan rápido responde tu sitio cuando alguien lo toca. Esta página explica, en palabras simples, qué se mide, cómo se cuenta y qué hace falta para ganar.",
  sections: [
    ["problem", "El problema"],
    ["who", "Quién hace qué"],
    ["citations", "Citas en IA"],
    ["top10", "La regla del 30%"],
    ["speed", "Velocidad"],
    ["queries", "Elegir queries"],
    ["cited", "Lograr que te citen"],
    ["limits", "Límites honestos"],
    ["next", "Lo que viene"],
  ],
  problem: {
    eyebrow: "El problema",
    title: "Google ahora responde primero. Y [[cita]] sus fuentes.",
    p1: "Cuando alguien busca, arriba de los resultados de siempre aparece cada vez más una **respuesta escrita por IA** (AI Overview, o AI Mode si la persona sigue conversando). Esa respuesta enlaza a las páginas de donde sacó la información.",
    p2: "Si tu página es una de esas fuentes, la persona te ve antes que a nadie. Si no, ve a tu competencia. Un informe de posiciones de siempre no dice nada de esto.",
    s1: ["Servicio 1 · AIO Pro", "¿Las respuestas de IA de Google citan tus páginas?"],
    s2: ["Servicio 2 · INP Sprint", "¿Tu sitio responde rápido cuando alguien lo toca?"],
  },
  who: {
    eyebrow: "Quién hace qué",
    title: "La plataforma mide. Las personas mejoran.",
    cards: [
      ["La plataforma", "Mide todos los días, guarda la evidencia y la muestra en un portal privado por cliente."],
      ["El equipo", "Elige qué medir, interpreta los resultados y mejora el contenido y el sitio."],
      ["El cliente", "Abre su portal de solo lectura y aprueba los cambios."],
    ],
    note: "La plataforma no mejora nada por sí sola. Hoy, elegir qué medir también es una decisión humana: ver “Elegir queries”.",
  },
  citations: {
    eyebrow: "Citas en IA · AIO Pro",
    title: "Congela la lista. Revisa todos los días. Cuenta a tus fans.",
    steps: [
      ["Congelar la lista", "Hasta 60 queries, bloqueadas por 60 días. Una lista congelada no se edita, así la medición es justa y comparable."],
      ["Revisar a diario", "A la misma hora, todos los días, siempre en las mismas condiciones: EE. UU., inglés, celular. El resultado crudo de cada chequeo se guarda."],
      ["Contar citas", "Una query cuenta una sola vez, la primera vez que una página tuya aparece entre las fuentes de la respuesta de IA dentro de la ventana."],
    ],
    targetsLabel: "Las metas, por ventana de 60 días",
    floor: "piso 12",
    target: "objetivo 18",
    bonus: "bonus 25",
    bullets: [
      "Piso **12**, objetivo **18**, bonus **25** citas por ventana de 60 días.",
      "¿Menos de 12 al día 60? **El 20% del fee vuelve como crédito** (crédito, no reembolso).",
      "La **tasa de cita** siempre está a la vista: de todos los chequeos en que Google respondió con IA, el porcentaje en que te eligió a ti.",
    ],
  },
  top10: {
    eyebrow: "La regla del 30%",
    title: "Una cita desde fuera del top 10 es la prueba real.",
    p: "Para cada query, Google también muestra los 10 resultados orgánicos de siempre. Una cita es **off-top10** cuando la página citada no estaba entre esos 10 resultados ese mismo día (se compara por la dirección exacta de la página, no por sitio). Al menos el **30% de las citas** deben ser off-top10.",
    organicLabel: "Resultados orgánicos · misma query, mismo día",
    upTo: "… hasta el 10",
    aiLabel: "Respuesta de IA · fuentes",
    aiText: "La IA te citó desde la posición 34. Eso es **off-top10**: te eligió por tu contenido, no porque ya estuvieras primero.",
    bullets: ["Prueba que la IA te eligió por lo que dice tu página, no solo porque Google ya te tenía primero.", "Evita contar citas que el cliente habría recibido de todos modos."],
    exampleLabel: "Una query, 60 días",
    days: [
      ["Día 12", "Google responde con IA y cita tu página. La query pasa a ser **una cita**."],
      ["Día 13+", "Sigue citándote. **No** suma otra cita, pero sube la tasa de cita."],
      ["Día 60", "14 citas, 5 de ellas off-top10 (36%): se cumplen el piso y la regla del 30%."],
    ],
  },
  speed: {
    eyebrow: "Velocidad · INP Sprint",
    title: "Rápido cuando importa: cuando alguien toca.",
    p: "**INP** (Interaction to Next Paint) es cuánto tarda el sitio en reaccionar cuando alguien toca, hace clic o escribe. Google lo usa como señal de experiencia.",
    bullets: [
      "Se mide **en celular**, con visitantes reales (un pequeño script en el sitio) y con los datos públicos de Google (CrUX).",
      "Objetivo: INP p75 de **200 ms** o menos, sostenido en **dos ventanas completas de 28 días** después de que se publica el trabajo.",
      "Los scripts de terceros que el cliente decide mantener (por ejemplo, un banner de consentimiento) quedan **fuera de la garantía**. Tag Bouncer permite al cliente decidir cuáles entran.",
    ],
  },
  queries: {
    eyebrow: "Elegir queries",
    title: "La decisión más importante la toma una persona, hoy.",
    p1: "El resultado depende de qué queries se miden. Hoy el equipo elige la lista y la carga a mano en el Admin. Una buena lista tiene:",
    bullets: [
      "**Búsquedas que traen clientes**, no solo las más populares: intención real de compra o consulta.",
      "**Preguntas y long tail** (“cómo elegir…”, “mejor X para Y”), que son las que más disparan respuestas de IA.",
      "**Queries donde tienes posibilidades reales.** Un sitio nuevo contra gigantes difícilmente llegue a 12 citas.",
      "Cada una se puede **mejorar con una página concreta**.",
    ],
    p2: "Las ideas salen del Search Console del cliente (queries con impresiones y posición 4 a 20, preguntas y long tail), de las preguntas que Google ya asocia al dominio y de lo que el cliente quiere ganar. Hoy el Search Console se exporta y se pega a mano: no hay conexión automática.",
  },
  cited: {
    eyebrow: "Lograr que te citen",
    title: "Qué hace falta para que los robots te elijan.",
    p1: "La plataforma no hace esta parte; la hace el equipo. Según Google, no existe un marcado especial para la IA: valen las bases del SEO.",
    cards: [
      ["Indexada y elegible", "Una página que no está indexada, o que no puede mostrar un snippet, no se puede citar."],
      ["Una página por query", "Responde la pregunta directo: respuesta clara al principio, encabezados limpios, datos concretos."],
      ["Autoridad y confianza", "Datos estructurados donde corresponda, menciones y reseñas."],
      ["Un sitio rápido", "Un buen INP mejora cada visita, incluidas las que manda la IA."],
    ],
    p2: "El portal muestra dónde trabajar: la vista de **brecha** lista las queries donde la IA responde pero cita a otros, y a quiénes. Si tras un cambio una query empieza a citarte, lo ves.",
  },
  limits: {
    eyebrow: "Límites honestos",
    title: "Lo que esto no es.",
    bullets: [
      "**No promete posiciones ni citas concretas.** Mide y da una garantía definida: un piso de 12, o crédito.",
      "**No cubre ChatGPT ni otras IA dentro de la garantía.** Esa parte es un módulo informativo, con su fecha, fuera del SLA.",
      "**No indexa páginas ni arregla el sitio.** Mide; el trabajo es del equipo.",
    ],
  },
  next: {
    eyebrow: "Lo que viene",
    title: "Un asesor de IA. Todavía no está construido.",
    p: "Elegir queries y decidir qué mejorar depende de la experiencia del equipo. El plan es una capa de IA que asesore, siempre con una persona revisando:",
    bullets: [
      "**Proponer qué medir,** con datos reales y el motivo de cada query.",
      "**Explicar por qué no te citan,** comparando la respuesta de IA, las páginas citadas y la tuya.",
      "**Recomendar mejoras de contenido** por página.",
      "**Cerrar el ciclo:** ver si la query empezó a citarte tras el cambio.",
    ],
    note: "Esto es una intención, todavía no una función.",
  },
  glossary: {
    eyebrow: "Glosario",
    terms: [
      ["AI Overview / AI Mode", "Las respuestas de IA de Google, con fuentes citadas."],
      ["Query", "Una búsqueda concreta que se mide."],
      ["Lista congelada", "Las queries fijas durante 60 días."],
      ["Cita", "Una query donde una página tuya aparece entre las fuentes, al menos una vez en la ventana."],
      ["Off-top10", "Una cita desde una página que ese día no estaba en el top 10 orgánico de esa query."],
      ["Tasa de cita", "% de respuestas de IA en las que te citaron."],
      ["Snapshot", "El resultado crudo de un chequeo, guardado como evidencia."],
      ["INP / CrUX", "Velocidad de interacción / los datos reales públicos de Google."],
      ["Crédito", "El 20% del fee si al día 60 hay menos de 12 citas."],
    ],
  },
  cta: { text: "¿Listo para que los robots sean tus mayores fans?", button: "Empezar un fan club" },
  footer: "Medido en EE. UU. · inglés · mobile · misma hora todos los días",
};

export const COPY: Record<Lang, Copy> = { en, es };
