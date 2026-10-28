// Categorías de La Ouija que dejó el admin en el editor (se guardan aparte de las tarjetas y del tablero).
import { DEFAULT_CATEGORIES, parseCategories } from "@/game/content";
import { getStore } from "./store";

const CATEGORIES_KEY = "cards:categories";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Las categorías vigentes (las de serie si el admin no cambió nada). */
export async function loadCategories(): Promise<string[]> {
  const raw = await getStore().get(CATEGORIES_KEY);
  try {
    return raw ? parseCategories(JSON.parse(raw)) : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function saveCategories(raw: unknown): Promise<string[]> {
  const list = parseCategories(raw);
  await getStore().set(CATEGORIES_KEY, JSON.stringify(list), TEN_YEARS);
  return list;
}
