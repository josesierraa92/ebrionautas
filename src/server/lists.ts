// Listas editables del juego que dejó el admin en el editor (categorías de La Ouija, trabalenguas y apodos): se guardan aparte de las tarjetas y del tablero.
import { DEFAULT_CATEGORIES, DEFAULT_NICKNAMES, DEFAULT_NUNCA, DEFAULT_TWISTERS, parseCategories, parseNicknames, parseNunca, parseTwisters, type ContentLists } from "@/game/content";
import { getStore } from "./store";

const KEYS = { categories: "cards:categories", twisters: "cards:twisters", nicknames: "cards:nicknames", nunca: "cards:nunca" } as const;
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const PARSE = { categories: parseCategories, twisters: parseTwisters, nicknames: parseNicknames, nunca: parseNunca };
const DEFAULTS = { categories: DEFAULT_CATEGORIES, twisters: DEFAULT_TWISTERS, nicknames: DEFAULT_NICKNAMES, nunca: DEFAULT_NUNCA };

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
  const [categories, twisters, nicknames, nunca] = await Promise.all([load("categories"), load("twisters"), load("nicknames"), load("nunca")]);
  return { categories, twisters, nicknames, nunca };
}

/** Guarda las listas que lleguen (las que falten no se tocan) y devuelve las vigentes. */
export async function saveLists(raw: Partial<Record<keyof ContentLists, unknown>>): Promise<ContentLists> {
  for (const kind of ["categories", "twisters", "nicknames", "nunca"] as const) {
    if (Array.isArray(raw[kind])) await getStore().set(KEYS[kind], JSON.stringify(PARSE[kind](raw[kind])), TEN_YEARS);
  }
  return loadLists();
}
