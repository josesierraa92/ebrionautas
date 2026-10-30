// Contenido para los retos: categorías de La Ouija y trabalenguas.

/** Categorías de serie (el admin puede cambiarlas desde el editor: ver `getCategories`). */
export const DEFAULT_CATEGORIES = [
  "marcas de cerveza",
  "cócteles",
  "países de Sudamérica",
  "capitales de Europa",
  "equipos de fútbol",
  "canciones de reguetón",
  "películas de Marvel",
  "frutas",
  "marcas de carros",
  "palabras que rimen con 'copa'",
  "personajes de Los Simpson",
  "animales de la selva",
  "apps del celular",
  "cosas que se hacen en una fiesta",
  "películas de terror",
  "nombres de exnovios/exnovias (de cualquiera)",
  "cantantes colombianos",
  "comidas rápidas",
  "deportes olímpicos",
  "excusas para no ir a trabajar",
];

/** Valida una lista que llega del editor o del almacén: textos cortos, sin repetir, hasta 200; si queda vacía, la de serie. */
function cleanList(raw: unknown, fallback: string[], maxLen: number): string[] {
  if (!Array.isArray(raw)) return fallback;
  const out: string[] = [];
  for (const x of raw) {
    const t = typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, maxLen) : "";
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= 200) break;
  }
  return out.length ? out : fallback;
}

let categories: string[] = DEFAULT_CATEGORIES;
/** Las categorías vigentes de La Ouija (las de serie, o las que el admin dejó en el editor). */
export const getCategories = () => categories;
export function setCategories(list: string[]) {
  categories = list.length ? list : DEFAULT_CATEGORIES;
}
export const parseCategories = (raw: unknown) => cleanList(raw, DEFAULT_CATEGORIES, 60);

/** Trabalenguas de serie (Lenguados); el admin puede cambiarlos desde el editor. */
export const DEFAULT_TWISTERS = [
  "Tres tristes tigres tragaban trigo en un trigal.",
  "Pablito clavó un clavito, ¿qué clavito clavó Pablito?",
  "El cielo está enladrillado, ¿quién lo desenladrillará? El desenladrillador que lo desenladrille buen desenladrillador será.",
  "Compré pocas copas, pocas copas compré, y como compré pocas copas, pocas copas pagué.",
  "Erre con erre cigarro, erre con erre barril, rápido corren los carros cargados de azúcar del ferrocarril.",
  "Si la calaca bebe mezcal, el mezcal se bebe a la calaca.",
  "Pepe Pecas pica papas con un pico, con un pico pica papas Pepe Pecas.",
  "Me han dicho que has dicho un dicho que han dicho que he dicho yo.",
];
let twisters: string[] = DEFAULT_TWISTERS;
export const getTwisters = () => twisters;
export function setTwisters(list: string[]) {
  twisters = list.length ? list : DEFAULT_TWISTERS;
}
export const parseTwisters = (raw: unknown) => cleanList(raw, DEFAULT_TWISTERS, 240);

/** Apodos de serie: en la casilla «Nuevo apodo» sale uno al azar y quien se equivoque al llamarlo bebe. */
export const DEFAULT_NICKNAMES = ["Chorizo", "Pelón", "Mochila", "Pelusa", "Chiquitín", "Mazorca", "Sapo", "Tarzán", "Cucharita", "Paquete", "Pulga", "Tilín"];
let nicknames: string[] = DEFAULT_NICKNAMES;
export const getNicknames = () => nicknames;
export function setNicknames(list: string[]) {
  nicknames = list.length ? list : DEFAULT_NICKNAMES;
}
export const parseNicknames = (raw: unknown) => cleanList(raw, DEFAULT_NICKNAMES, 30);

/** Todas las listas editables juntas (así viajan entre el editor, el servidor y el juego). */
export type ContentLists = { categories: string[]; twisters: string[]; nicknames: string[] };
export const getLists = (): ContentLists => ({ categories, twisters, nicknames });
export function setLists(raw: Partial<Record<keyof ContentLists, unknown>> | null | undefined) {
  if (raw?.categories) setCategories(parseCategories(raw.categories));
  if (raw?.twisters) setTwisters(parseTwisters(raw.twisters));
  if (raw?.nicknames) setNicknames(parseNicknames(raw.nicknames));
}

export function pick<T>(list: T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length)];
}
