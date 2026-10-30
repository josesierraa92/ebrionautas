// Listas editables del juego (categorías de La Ouija, trabalenguas, apodos, Yo nunca, Juicio de los vivos, retos, retos de ronda y reflejos).
// Las listas de serie viven en el código (`game/content.ts`) y el editor guarda **solo la diferencia**: lo que el admin añadió y lo que borró de
// las de serie. Así valen los dos lados: lo que se añade desde el código aparece solo (salvo lo que el admin ya había borrado) y lo que el
// admin añade o borra en el editor se queda aunque se cambie el código.
import { DEFAULT_CATEGORIES, DEFAULT_NICKNAMES, DEFAULT_JUICIO, DEFAULT_NUNCA, DEFAULT_REFLEJOS, DEFAULT_RETOS, DEFAULT_RONDA, DEFAULT_TWISTERS, parseCategories, parseJuicio, parseNicknames, parseNunca, parseReflejos, parseRetos, parseRonda, parseTwisters, type ContentLists } from "@/game/content";
import { HISTORIC_DEFAULTS } from "./historicDefaults";
import { getStore } from "./store";

const KEYS = { categories: "cards:categories", twisters: "cards:twisters", nicknames: "cards:nicknames", nunca: "cards:nunca", juicio: "cards:juicio", ronda: "cards:ronda", retos: "cards:retos", reflejos: "cards:reflejos" } as const;
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const PARSE = { categories: parseCategories, twisters: parseTwisters, nicknames: parseNicknames, nunca: parseNunca, juicio: parseJuicio, ronda: parseRonda, retos: parseRetos, reflejos: parseReflejos };
const DEFAULTS = { categories: DEFAULT_CATEGORIES, twisters: DEFAULT_TWISTERS, nicknames: DEFAULT_NICKNAMES, nunca: DEFAULT_NUNCA, juicio: DEFAULT_JUICIO, ronda: DEFAULT_RONDA, retos: DEFAULT_RETOS, reflejos: DEFAULT_REFLEJOS };
const KINDS = Object.keys(KEYS) as (keyof ContentLists)[];
/** Formato guardado: `{ v: 4, added, removed }`. Antes se guardaba la lista entera (un arreglo, o `{ v, items }`): se migra al leerla. */
const SAVE_VERSION = 4;

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Lo de serie, sin lo borrado, más lo añadido por el admin. */
function merge(kind: keyof ContentLists, added: string[], removed: string[]): string[] {
  const gone = new Set(removed.map(norm));
  const out = DEFAULTS[kind].filter((x) => !gone.has(norm(x)));
  for (const a of added) if (!out.some((x) => norm(x) === norm(a))) out.push(a);
  return out.length ? out : DEFAULTS[kind];
}

/** Lo que cambió una lista respecto a la de serie. */
function diff(kind: keyof ContentLists, items: string[]): { added: string[]; removed: string[] } {
  const have = new Set(items.map(norm));
  const base = new Set(DEFAULTS[kind].map(norm));
  return { added: items.filter((x) => !base.has(norm(x))), removed: DEFAULTS[kind].filter((x) => !have.has(norm(x))) };
}

async function load(kind: keyof ContentLists): Promise<string[]> {
  const raw = await getStore().get(KEYS[kind]);
  try {
    if (!raw) return DEFAULTS[kind];
    const data = JSON.parse(raw) as unknown;
    if (data && !Array.isArray(data) && (data as { v?: unknown }).v === SAVE_VERSION) {
      const { added, removed } = data as { added?: unknown; removed?: unknown };
      // ojo: `PARSE` devuelve la lista de serie cuando queda vacía, y aquí «sin añadidos» es vacío de verdad
      const add = Array.isArray(added) && added.length ? PARSE[kind](added) : [];
      return merge(kind, add, Array.isArray(removed) ? (removed as string[]) : []);
    }
    // formato viejo: la lista entera. Lo que no está en la de hoy y fue alguna vez de serie era una carta quitada o movida: no cuenta como añadida.
    const items = PARSE[kind](Array.isArray(data) ? data : (data as { items?: unknown }).items);
    const d = diff(kind, items);
    return merge(kind, d.added.filter((x) => !HISTORIC_DEFAULTS.has(norm(x))), d.removed);
  } catch {
    return DEFAULTS[kind];
  }
}

/** Las listas vigentes (las de serie, con lo que el admin añadió y borró). */
export async function loadLists(): Promise<ContentLists> {
  const all = await Promise.all(KINDS.map(load));
  return Object.fromEntries(KINDS.map((k, i) => [k, all[i]])) as ContentLists;
}

/** Guarda las listas que lleguen (las que falten no se tocan) como diferencia con las de serie y devuelve las vigentes. */
export async function saveLists(raw: Partial<Record<keyof ContentLists, unknown>>): Promise<ContentLists> {
  for (const kind of KINDS) {
    if (!Array.isArray(raw[kind])) continue;
    const { added, removed } = diff(kind, PARSE[kind](raw[kind]));
    await getStore().set(KEYS[kind], JSON.stringify({ v: SAVE_VERSION, added, removed }), TEN_YEARS);
  }
  return loadLists();
}
