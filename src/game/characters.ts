// Fichas de los jugadores: personajes zombi del kit "Mini Characters" de Kenney (CC0), hombres para los hombres y
// mujeres para las mujeres. En la TV son dibujos (sprites) sacados de una hoja con cada personaje mirando hacia
// delante y hacia atrás, quieto y caminando; las otras dos direcciones son el mismo dibujo en espejo.
import type { Gender } from "./engine";

export const MALE = ["a", "b", "c", "d", "e", "f"].map((l) => `character-male-${l}`);
export const FEMALE = ["a", "b", "c", "d", "e", "f"].map((l) => `character-female-${l}`);
/** Una fila de la hoja por personaje, en este orden. */
export const CHARACTERS = [...MALE, ...FEMALE];

/**
 * Alto del personaje en la TV respecto al tamaño de la ficha (que es 0,86 del ancho de una casilla con hasta 3
 * fichas en ella): más o menos un zombi de la decoración. Se multiplica por el tamaño elegido en el editor.
 */
export const CHARACTER_HEIGHT = 0.42;
export const TOKEN_TO_TILE = 0.86;

/** Columnas de la hoja: de frente (quieto, paso A, paso B) y de espaldas (quieto, paso A, paso B). */
export const SHEET_COLS = 6;
export type Pose = "idle" | "walkA" | "walkB";
const POSES: Pose[] = ["idle", "walkA", "walkB"];

/**
 * Hoja de personajes: imagen y medidas de cada dibujo (`cw`×`ch` px). `feet`: altura de los pies desde arriba (0..1);
 * `span`: alto del dibujo medido en alturas del personaje (para dibujarlo del tamaño justo).
 */
export type CharacterSheet = { image: string; cw: number; ch: number; feet: number; span: number };

/** La hoja de serie, dibujada con la cámara isométrica del tablero de serie (scripts/characters/sheet.mjs). */
export const STOCK_SHEET: CharacterSheet = { image: "/art/zombis.webp", cw: 192, ch: 288, feet: 0.758, span: 1.714 };

/** Valida una hoja publicada. */
export function parseSheet(raw: unknown): CharacterSheet | undefined {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object" || typeof r.image !== "string") return undefined;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  const [cw, ch, feet, span] = [n(r.cw), n(r.ch), n(r.feet), n(r.span)];
  if (!cw || !ch || !feet || !span || feet > 1 || span > 10 || cw > 1024 || ch > 1024) return undefined;
  return { image: r.image, cw, ch, feet, span };
}

/**
 * Personaje de cada jugador: los hombres van tomando los personajes hombre en orden y las mujeres los de mujer
 * (sin género, como hombre). Con más de 6 de un género se repiten (se distinguen por el nombre).
 */
export function characterOf(players: { id: string; gender?: Gender | null }[], id: string): number {
  const me = players.find((p) => p.id === id);
  const female = me?.gender === "mujer";
  const same = players.filter((p) => (p.gender === "mujer") === female);
  const i = Math.max(0, same.findIndex((p) => p.id === id));
  return (female ? MALE.length : 0) + (i % 6);
}

/**
 * Dibujo según hacia dónde mira en pantalla (dx, dy: hacia dónde va). Mirando hacia abajo de la pantalla se le ve de
 * frente; hacia arriba, de espaldas. Los dibujos miran a la derecha; hacia la izquierda se dan la vuelta (espejo).
 */
export function spriteOf(character: number, dx: number, dy: number, pose: Pose) {
  const back = dy < 0;
  return { row: character, col: (back ? 3 : 0) + POSES.indexOf(pose), mirror: dx < 0 };
}
