// Listas editables del juego que dejó el admin en el editor (categorías de La Ouija, trabalenguas, apodos, Yo nunca, Juicio de los vivos, retos…): se guardan aparte de las tarjetas y del tablero.
import { DEFAULT_CATEGORIES, DEFAULT_NICKNAMES, DEFAULT_JUICIO, DEFAULT_NUNCA, DEFAULT_REFLEJOS, DEFAULT_RETOS, DEFAULT_RONDA, DEFAULT_TWISTERS, parseCategories, parseJuicio, parseNicknames, parseNunca, parseReflejos, parseRetos, parseRonda, parseTwisters, type ContentLists } from "@/game/content";
import { getStore } from "./store";

const KEYS = { categories: "cards:categories", twisters: "cards:twisters", nicknames: "cards:nicknames", nunca: "cards:nunca", juicio: "cards:juicio", ronda: "cards:ronda", retos: "cards:retos", reflejos: "cards:reflejos" } as const;
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const PARSE = { categories: parseCategories, twisters: parseTwisters, nicknames: parseNicknames, nunca: parseNunca, juicio: parseJuicio, ronda: parseRonda, retos: parseRetos, reflejos: parseReflejos };
const DEFAULTS = { categories: DEFAULT_CATEGORIES, twisters: DEFAULT_TWISTERS, nicknames: DEFAULT_NICKNAMES, nunca: DEFAULT_NUNCA, juicio: DEFAULT_JUICIO, ronda: DEFAULT_RONDA, retos: DEFAULT_RETOS, reflejos: DEFAULT_REFLEJOS };

/**
 * Versión de lo guardado. Lo que se guarda lleva `{ v, items }` (antes era solo la lista, = versión 1). Cuando se reorganizan las listas
 * (se mueven cartas de una a otra, p. ej. al crear «Reflejos y prendas»), se sube el mínimo de esa lista y lo que el admin había guardado
 * antes **se ignora** (queda en Redis hasta el siguiente «Guardar») y sale la lista del código, que es la correcta.
 */
const SAVE_VERSION = 3;
const MIN_VERSION: Record<keyof ContentLists, number> = { categories: 1, twisters: 1, nicknames: 1, nunca: 1, juicio: 3, ronda: 3, retos: 3, reflejos: 3 };

async function load(kind: keyof ContentLists): Promise<string[]> {
  const raw = await getStore().get(KEYS[kind]);
  try {
    if (!raw) return DEFAULTS[kind];
    const data = JSON.parse(raw) as unknown;
    const v = Array.isArray(data) ? 1 : Number((data as { v?: unknown })?.v ?? 0);
    if (v < MIN_VERSION[kind]) return DEFAULTS[kind];
    return PARSE[kind](Array.isArray(data) ? data : (data as { items?: unknown }).items);
  } catch {
    return DEFAULTS[kind];
  }
}

/** Las listas vigentes (las de serie si el admin no cambió nada). */
export async function loadLists(): Promise<ContentLists> {
  const [categories, twisters, nicknames, nunca, juicio, ronda, retos, reflejos] = await Promise.all([load("categories"), load("twisters"), load("nicknames"), load("nunca"), load("juicio"), load("ronda"), load("retos"), load("reflejos")]);
  return { categories, twisters, nicknames, nunca, juicio, ronda, retos, reflejos };
}

/** Guarda las listas que lleguen (las que falten no se tocan) y devuelve las vigentes. */
export async function saveLists(raw: Partial<Record<keyof ContentLists, unknown>>): Promise<ContentLists> {
  for (const kind of ["categories", "twisters", "nicknames", "nunca", "juicio", "ronda", "retos", "reflejos"] as const) {
    if (Array.isArray(raw[kind])) await getStore().set(KEYS[kind], JSON.stringify({ v: SAVE_VERSION, items: PARSE[kind](raw[kind]) }), TEN_YEARS);
  }
  return loadLists();
}
