// Tarjetas de las casillas (la que sale en la TV y en el celular al caer en una): título y texto de cada una, con los
// de serie y los que el admin cambió desde el editor (se guardan aparte del tablero y valen para todas las mesas).
// Los textos llevan huecos entre llaves ({nombre}, {vasos}…) que se rellenan con los datos de la partida.
import { BOARD, TILE_NAMES, type Tile } from "./board";

export type CardText = { title: string; text: string };
/** Lo que el admin cambió: por clave de tarjeta, solo los campos que tocó. */
export type CardOverrides = Record<string, Partial<CardText>>;

export type CardVar = { name: string; about: string };
export type CardDef = { key: string; label: string; tiles: number[]; vars: CardVar[]; defaults: CardText };

const NOMBRE: CardVar = { name: "nombre", about: "el jugador que cayó" };
const VASOS: CardVar = { name: "vasos", about: "cuántos vasos (con «vaso»/«vasos»)" };

/** Clave de la tarjeta de una casilla: el tipo, y además el título en las que cada una tiene el suyo. */
export const cardKeyOf = (t: Tile) => (t.type === "RASGO" || t.type === "POSICION" || t.type === "RETO" ? `${t.type}:${t.title}` : t.type);

/** Tarjetas de resultado (al tirar sin moverse). */
export const RESULT_KEYS = { mazeOk: "RESULTADO:niebla-salva", mazeNo: "RESULTADO:niebla-pierde", jail: "RESULTADO:purgatorio", duel: "RESULTADO:duelo" } as const;

/**
 * Textos de serie ANTERIORES de las tarjetas que cambiaron de regla: si lo guardado en el editor es justo uno de ellos, no es una
 * edición del admin sino el texto viejo, y se ignora (así el editor y el juego enseñan el nuevo). Al cambiar un texto de serie, añade el
 * viejo aquí.
 */
const LEGACY: Record<string, { title?: string[]; text?: string[] }> = {
  OCA: { text: ["{nombre} bebe 1 vaso diciendo «¡De murciélago en murciélago y bebo porque me toca!»; {destino} y vuelve a tirar."] },
  CULTURAL: { text: ["Sale una categoría. Por turnos, cada uno dice una respuesta rápido; quien se quede en blanco o repita, bebe 1 vaso."] },
  A_BEBER: { title: ["¡Ronda de mezcal!", "Ronda de mezcal"] },
};

const FIXED: Record<string, Omit<CardDef, "key" | "tiles" | "label"> & { label?: string }> = {
  SALIDA: { vars: [], defaults: { title: TILE_NAMES.SALIDA, text: "Es medianoche del Día de Muertos: los muertos salen de sus tumbas para su única noche de fiesta. Deben volver antes de que salga el sol… aunque lleguen borrachos." } },
  META: { vars: [], defaults: { title: TILE_NAMES.META, text: "¡Antes del amanecer! El primero en volver a su tumba gana (como pueda tenerse en pie) y reparte el resto de la bebida como quiera." } },
  POSADA: { vars: [NOMBRE], defaults: { title: TILE_NAMES.POSADA, text: "{nombre} se refugia en La Capilla: es suelo sagrado y nadie le puede mandar beber hasta su próximo turno." } },
  A_BEBER: { vars: [NOMBRE, VASOS], defaults: { title: "Trago de regalo", text: "{nombre} reparte {vasos} entre quien quiera (también se los puede quedar)." } },
  DUELO: { vars: [NOMBRE, { name: "rivales", about: "a cuántos rivales reta («1 rival», «2 rivales»)" }], defaults: { title: TILE_NAMES.DUELO, text: "{nombre} reta hasta a {rivales}. Uno a uno tiran el dado: quien saque menos bebe 1 vaso. Si empatan, se repite." } },
  OCA: {
    vars: [NOMBRE, { name: "destino", about: "lo que gana si bebe («volar hasta la casilla 18 y volver a tirar» o «volver a tirar (es el último murciélago)»)" }],
    defaults: { title: "¡De murciélago en murciélago!", text: "{nombre} puede beber 1 vaso diciendo «¡De murciélago en murciélago y bebo porque me toca!» para {destino}. Si no quiere, se planta y se queda en esta casilla." },
  },
  LABERINTO: { vars: [NOMBRE], defaults: { title: TILE_NAMES.LABERINTO, text: "{nombre} se pierde entre las tumbas y la niebla. En sus turnos tira el dado: con 5 o 6 escapa; si no, bebe 1 vaso y sigue perdido." } },
  REGLA: { vars: [NOMBRE], defaults: { title: TILE_NAMES.REGLA, text: "{nombre} dicta una ley para todos (por ejemplo: prohibido decir «beber»). Dura hasta que alguien ponga otra. Quien la rompa, bebe 1 vaso." } },
  CULTURAL: { vars: [{ name: "categoria", about: "la categoría que salió (al azar entre las de «Categorías»)" }], defaults: { title: TILE_NAMES.CULTURAL, text: "Categoría: «{categoria}». Por turnos, cada uno dice una respuesta rápido; quien se quede en blanco o repita, bebe 1 vaso." } },
  HIPNOSIS: { vars: [NOMBRE], defaults: { title: TILE_NAMES.HIPNOSIS, text: "Un espíritu posee a {nombre}: hasta su próximo turno, se bebe la mitad de todo lo que beban los demás." } },
  CARCEL: {
    vars: [NOMBRE],
    defaults: { title: TILE_NAMES.CARCEL, text: "{nombre} cae al Purgatorio. En su próximo turno tira el dado para pagar sus pecados: con 1, 2 o 3 bebe 2 vasos; con 4, 5 o 6 bebe 4. Después vuelve a tirar para avanzar. Si otro jugador cae aquí antes, sale gratis." },
  },
  MUERTE: { vars: [NOMBRE], defaults: { title: TILE_NAMES.MUERTE, text: "¡Qué mala suerte! {nombre} cae en La Fosa y tiene que volver a empezar desde medianoche (casilla 1)." } },
  PATINAZO: {
    vars: [NOMBRE, VASOS, { name: "casilla", about: "a qué casilla rueda" }],
    defaults: { title: TILE_NAMES.PATINAZO, text: "{nombre} tropieza con una lápida. Para no caerse elige: bebe {vasos} de golpe o rueda hasta la casilla {casilla}." },
  },
  ESCLAVO: { vars: [NOMBRE], defaults: { title: TILE_NAMES.ESCLAVO, text: "{nombre} firma un Pacto de Sangre con otro jugador: cada vez que {nombre} beba, su pactado bebe lo mismo. Dura hasta que otro caiga en esta casilla." } },
};

const POSICION_VARS: CardVar[] = [NOMBRE, VASOS, { name: "lado", about: "«por detrás» o «por delante»" }, { name: "lista", about: "quiénes son («: Ana, Beto.») o «. Esta vez, nadie.»" }];
const RASGO_VARS: CardVar[] = [VASOS, { name: "quienes", about: "quiénes beben («los hombres», «quienes lleven gafas»…)" }];

/** Todas las tarjetas distintas (una por clave, con las casillas que la usan) en el orden del tablero, y las de resultado. */
export function cardCatalog(): CardDef[] {
  const seen = new Map<string, CardDef>();
  for (const t of BOARD) {
    const key = cardKeyOf(t);
    const old = seen.get(key);
    if (old) {
      old.tiles.push(t.n);
      continue;
    }
    const base = FIXED[t.type];
    let def: CardDef;
    if (base) def = { key, label: TILE_NAMES[t.type], tiles: [t.n], vars: base.vars, defaults: base.defaults };
    else if (t.type === "POSICION")
      def = { key, label: t.title, tiles: [t.n], vars: POSICION_VARS, defaults: { title: t.title, text: "Beben {vasos} todos los que van {lado} de {nombre}{lista}" } };
    else if (t.type === "RASGO")
      def = { key, label: t.title, tiles: [t.n], vars: RASGO_VARS, defaults: { title: t.title, text: "Juicio de los vivos: beben {vasos} {quienes}." } };
    else if (t.type === "RETO") def = { key, label: t.title, tiles: [t.n], vars: [], defaults: { title: t.title, text: t.text } };
    else continue;
    seen.set(key, def);
  }
  const res: CardDef[] = [
    { key: RESULT_KEYS.mazeOk, label: "Niebla: se salva", tiles: [], vars: [NOMBRE, { name: "dado", about: "lo que sacó" }], defaults: { title: "¡Se salvó!", text: "{nombre} saca {dado} y encuentra la salida del Panteón en Niebla. No bebe y en su próximo turno vuelve a avanzar." } },
    { key: RESULT_KEYS.mazeNo, label: "Niebla: sigue perdido", tiles: [], vars: [NOMBRE, { name: "dado", about: "lo que sacó" }], defaults: { title: "¡Sigue perdido!", text: "{nombre} saca {dado}: no es 5 ni 6. Bebe 1 vaso y sigue perdido entre las tumbas." } },
    { key: RESULT_KEYS.duel, label: "Duelo: resultado", tiles: [], vars: [{ name: "resultado", about: "una línea por rival: quién sacó cuánto y quién bebe" }], defaults: { title: "¡Resultado del duelo!", text: "{resultado}" } },
    { key: RESULT_KEYS.jail, label: "Purgatorio: sale", tiles: [], vars: [NOMBRE, { name: "dado", about: "lo que sacó" }, VASOS], defaults: { title: "¡Sale del Purgatorio!", text: "{nombre} saca {dado}: bebe {vasos} para pagar sus pecados y sale del Purgatorio. Ahora vuelve a tirar para avanzar." } },
  ];
  return [...seen.values(), ...res];
}

let CATALOG: Map<string, CardDef> | null = null;
const defOf = (key: string) => (CATALOG ??= new Map(cardCatalog().map((d) => [d.key, d]))).get(key);

let overrides: CardOverrides = {};
/** Los textos que cambió el admin (los carga la TV y el celular al abrir la partida). */
export function setCardOverrides(o: CardOverrides) {
  overrides = o;
}

/** ¿El admin cambió algo de esta tarjeta? */
export const hasCardOverride = (key: string) => !!overrides[key];

/** Rellena los huecos {x} de un texto con `vars` (los que no estén se dejan tal cual). */
export const fillCard = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

/** Texto de una tarjeta con los huecos rellenados: el del admin si lo cambió y, si no, el de serie. */
export function cardText(key: string, vars: Record<string, string | number>): CardText {
  const d = defOf(key);
  const base = d?.defaults ?? { title: "", text: "" };
  const o = overrides[key];
  return { title: fillCard(o?.title ?? base.title, vars), text: fillCard(o?.text ?? base.text, vars) };
}

/** Solo el título de una tarjeta (con el que cambió el admin, si lo hay), para los rótulos de las decisiones. */
export const cardTitle = (key: string) => cardText(key, {}).title;

/** Valida lo que llega del servidor o del editor: solo claves y huecos que existen, textos de tamaño razonable. */
export function parseCardOverrides(raw: unknown): CardOverrides {
  const out: CardOverrides = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    const d = defOf(key);
    if (!d || !v || typeof v !== "object") continue;
    const r = v as Record<string, unknown>;
    const clean = (x: unknown, max: number) => (typeof x === "string" ? x.replace(/\r/g, "").trim().slice(0, max) : undefined);
    const title = clean(r.title, 60);
    const text = clean(r.text, 600);
    const o: Partial<CardText> = {};
    if (title && title !== d.defaults.title && !LEGACY[key]?.title?.includes(title)) o.title = title;
    if (text && text !== d.defaults.text && !LEGACY[key]?.text?.includes(text)) o.text = text;
    if (o.title || o.text) out[key] = o;
  }
  return out;
}
