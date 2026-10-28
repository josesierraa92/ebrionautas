// Tablero publicado desde el editor (/admin/editor): una imagen renderizada con la cámara de la TV y dónde cae
// cada casilla en ella. La TV pone la imagen de fondo y encima las fichas (IsoBoard).
import { BOARD } from "./board";
import { parseSheet, type CharacterSheet } from "./characters";

export type PublishedBoard = {
  /** Momento de la publicación (sirve de versión). */
  version: number;
  /** URL de la imagen del tablero. */
  image: string;
  width: number;
  height: number;
  /** Centro de cada casilla en la imagen, en píxeles: la casilla n es tiles[n - 1]. */
  tiles: { x: number; y: number }[];
  /** Ancho en píxeles del rombo de una casilla (para escalar las fichas). */
  cell: number;
  /** Color de fondo (el cielo del render), para rellenar alrededor de la imagen. */
  bg: string;
  /** Imagen de la ficha de cada color de jugador (PLAYER_COLORS); null = el zombi de serie. */
  tokens?: (string | null)[];
  /** Tamaño en pantalla de cada ficha propia respecto al zombi de serie (1 = igual). */
  tokenScale?: number[];
  /** Cuánto acerca la TV al seguir una ficha (la vista elegida en el editor); si falta, unas 9 casillas a lo ancho. */
  zoom?: number;
  /** Hoja de los personajes zombi dibujada con el ángulo de este tablero (si falta, la de serie). */
  characters?: CharacterSheet;
  /** Tamaño de los personajes zombi elegido en el editor (1 = el de serie). */
  characterScale?: number;
};

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Valida los datos de una publicación (sin la imagen). */
export function parsePublished(raw: unknown): Omit<PublishedBoard, "image" | "version"> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const { width, height, cell, bg } = r;
  if (!finite(width) || !finite(height) || width < 100 || height < 100 || width > 16384 || height > 16384) return null;
  if (!finite(cell) || cell <= 0 || typeof bg !== "string" || !/^#[0-9a-f]{6}$/i.test(bg)) return null;
  if (!Array.isArray(r.tiles) || r.tiles.length !== BOARD.length) return null;
  const tiles = r.tiles.map((t) => {
    const p = t as Record<string, unknown>;
    return finite(p?.x) && finite(p?.y) ? { x: p.x, y: p.y } : null;
  });
  if (tiles.some((t) => !t)) return null;
  const zoom = finite(r.zoom) ? Math.min(12, Math.max(1, r.zoom)) : undefined;
  const characters = parseSheet(r.characters);
  const characterScale = finite(r.characterScale) ? Math.min(2, Math.max(0.5, r.characterScale)) : undefined;
  return { width, height, cell, bg, tiles: tiles as { x: number; y: number }[], ...(zoom && { zoom }), ...(characters && { characters }), ...(characterScale && { characterScale }) };
}
