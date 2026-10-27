// Tablero publicado desde el editor (/admin/editor): una imagen renderizada con la cámara de la TV y dónde cae
// cada casilla en ella. La TV pone la imagen de fondo y encima las fichas (IsoBoard).
import { BOARD } from "./board";

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
};

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Valida los datos de una publicación (sin la imagen). */
export function parsePublished(raw: unknown): Omit<PublishedBoard, "image" | "version"> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const { width, height, cell, bg } = r;
  if (!finite(width) || !finite(height) || width < 100 || height < 100 || width > 8000 || height > 8000) return null;
  if (!finite(cell) || cell <= 0 || typeof bg !== "string" || !/^#[0-9a-f]{6}$/i.test(bg)) return null;
  if (!Array.isArray(r.tiles) || r.tiles.length !== BOARD.length) return null;
  const tiles = r.tiles.map((t) => {
    const p = t as Record<string, unknown>;
    return finite(p?.x) && finite(p?.y) ? { x: p.x, y: p.y } : null;
  });
  if (tiles.some((t) => !t)) return null;
  return { width, height, cell, bg, tiles: tiles as { x: number; y: number }[] };
}
