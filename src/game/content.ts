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

let categories: string[] = DEFAULT_CATEGORIES;
/** Las categorías vigentes de La Ouija (las de serie, o las que el admin dejó en el editor). */
export const getCategories = () => categories;
export function setCategories(list: string[]) {
  categories = list.length ? list : DEFAULT_CATEGORIES;
}
/** Valida las categorías que llegan del editor o del almacén: textos cortos, sin repetir, hasta 200. */
export function parseCategories(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_CATEGORIES;
  const out: string[] = [];
  for (const x of raw) {
    const t = typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, 60) : "";
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= 200) break;
  }
  return out.length ? out : DEFAULT_CATEGORIES;
}

export const TONGUE_TWISTERS = [
  "Tres tristes tigres tragaban trigo en un trigal.",
  "Pablito clavó un clavito, ¿qué clavito clavó Pablito?",
  "El cielo está enladrillado, ¿quién lo desenladrillará? El desenladrillador que lo desenladrille buen desenladrillador será.",
  "Compré pocas copas, pocas copas compré, y como compré pocas copas, pocas copas pagué.",
  "Erre con erre cigarro, erre con erre barril, rápido corren los carros cargados de azúcar del ferrocarril.",
  "Si la calaca bebe mezcal, el mezcal se bebe a la calaca.",
  "Pepe Pecas pica papas con un pico, con un pico pica papas Pepe Pecas.",
  "Me han dicho que has dicho un dicho que han dicho que he dicho yo.",
];

export function pick<T>(list: T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length)];
}
