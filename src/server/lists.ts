// Listas editables del juego que dejó el admin en el editor (categorías de La Ouija, trabalenguas y apodos): se guardan aparte de las tarjetas y del tablero.
import { DEFAULT_CATEGORIES, DEFAULT_NICKNAMES, DEFAULT_JUICIO, DEFAULT_NUNCA, DEFAULT_RETOS, DEFAULT_RONDA, DEFAULT_TWISTERS, parseCategories, parseJuicio, parseNicknames, parseNunca, parseRetos, parseRonda, parseTwisters, type ContentLists } from "@/game/content";
import { getStore } from "./store";

const KEYS = { categories: "cards:categories", twisters: "cards:twisters", nicknames: "cards:nicknames", nunca: "cards:nunca", juicio: "cards:juicio", ronda: "cards:ronda", retos: "cards:retos" } as const;
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const PARSE = { categories: parseCategories, twisters: parseTwisters, nicknames: parseNicknames, nunca: parseNunca, juicio: parseJuicio, ronda: parseRonda, retos: parseRetos };
const DEFAULTS = { categories: DEFAULT_CATEGORIES, twisters: DEFAULT_TWISTERS, nicknames: DEFAULT_NICKNAMES, nunca: DEFAULT_NUNCA, juicio: DEFAULT_JUICIO, ronda: DEFAULT_RONDA, retos: DEFAULT_RETOS };

async function load(kind: keyof ContentLists): Promise<string[]> {
  const raw = await getStore().get(KEYS[kind]);
  try {
    return raw ? PARSE[kind](JSON.parse(raw)) : DEFAULTS[kind];
  } catch {
    return DEFAULTS[kind];
  }
}

/** Las listas vigentes (las de serie si el admin no cambió nada). */
export async function loadLists(): Promise<ContentLists> {
  const [categories, twisters, nicknames, nunca, juicio, ronda, retos] = await Promise.all([load("categories"), load("twisters"), load("nicknames"), load("nunca"), load("juicio"), load("ronda"), load("retos")]);
  return { categories, twisters, nicknames, nunca, juicio, ronda, retos };
}

/** Guarda las listas que lleguen (las que falten no se tocan) y devuelve las vigentes. */
export async function saveLists(raw: Partial<Record<keyof ContentLists, unknown>>): Promise<ContentLists> {
  for (const kind of ["categories", "twisters", "nicknames", "nunca", "juicio", "ronda", "retos"] as const) {
    if (Array.isArray(raw[kind])) await getStore().set(KEYS[kind], JSON.stringify(PARSE[kind](raw[kind])), TEN_YEARS);
  }
  return loadLists();
}
