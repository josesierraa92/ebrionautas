// Diseño del tablero hecho con el editor (/admin/editor). Se guarda en el mismo Redis que las mesas.
import { timingSafeEqual } from "node:crypto";
import { put } from "@vercel/blob";
import { parseLayout, type BoardLayout } from "@/editor/layout";
import { parsePublished, type PublishedBoard } from "@/game/publishedBoard";
import { RoomError } from "./rooms";
import { getStore } from "./store";

const KEY = "board:design";
const PUBLISHED_KEY = "board:published";
/** Solo en desarrollo, sin Vercel Blob: la imagen se guarda en el almacén y la sirve /api/board/image. */
const IMAGE_KEY = "board:image";
const TOKEN_KEY = (i: number) => `board:token:${i}`;
const MAX_TOKEN_BYTES = 450_000;
const TEN_YEARS = 10 * 365 * 24 * 3600;
const MAX_BYTES = 900_000; // Upstash acepta peticiones de hasta 1 MB

/** Comprueba la clave del admin (variable ADMIN_PASSWORD). En desarrollo, sin la variable, no se pide. */
export function checkAdmin(key: string | null) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    if (process.env.NODE_ENV === "production")
      throw new RoomError("Falta configurar la clave del admin (ADMIN_PASSWORD) en Vercel.", 503);
    return;
  }
  const a = Buffer.from(key ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new RoomError("Clave de admin incorrecta.", 401);
}

export async function loadDesign(): Promise<BoardLayout | null> {
  const raw = await getStore().get(KEY);
  if (!raw) return null;
  try {
    return parseLayout(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveDesign(raw: unknown): Promise<BoardLayout> {
  const layout = parseLayout(raw);
  if (!layout) throw new RoomError("El diseño no es válido.");
  const json = JSON.stringify(layout);
  if (json.length > MAX_BYTES) throw new RoomError("El diseño es demasiado grande para guardarlo.", 413);
  await getStore().set(KEY, json, TEN_YEARS);
  return layout;
}

/** Tablero que usa la TV (o null: la TV usa el tablero de serie). */
export async function loadPublished(): Promise<PublishedBoard | null> {
  const raw = await getStore().get(PUBLISHED_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublishedBoard;
  } catch {
    return null;
  }
}

/** Imagen de una ficha guardada en el almacén (solo desarrollo). */
export async function loadDevToken(i: number): Promise<Buffer | null> {
  const raw = Number.isInteger(i) && i >= 0 && i < 8 ? await getStore().get(TOKEN_KEY(i)) : null;
  return raw ? Buffer.from(raw, "base64") : null;
}

/** Imagen guardada en el almacén (solo desarrollo). */
export async function loadDevImage(): Promise<Buffer | null> {
  const raw = await getStore().get(IMAGE_KEY);
  return raw ? Buffer.from(raw, "base64") : null;
}

/**
 * Publica el tablero: sube la imagen (Vercel Blob; en desarrollo sin Blob, al almacén) y guarda dónde está
 * cada casilla. Desde ese momento las mesas lo usan.
 */
export async function publishBoard(raw: Record<string, unknown>): Promise<PublishedBoard> {
  const data = parsePublished(raw);
  if (!data) throw new RoomError("Faltan casillas: para publicar hacen falta las 62.");
  const m = typeof raw.image === "string" ? /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(raw.image) : null;
  if (!m) throw new RoomError("La imagen del tablero no es válida.");
  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length > 4_000_000) throw new RoomError("La imagen del tablero es demasiado grande.", 413);
  const version = Date.now();
  let image: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`tablero/tablero-${version}.webp`, bytes, { access: "public", contentType: "image/webp" });
    image = blob.url;
  } else if (process.env.NODE_ENV !== "production") {
    await getStore().set(IMAGE_KEY, m[1], TEN_YEARS);
    image = `/api/board/image?v=${version}`;
  } else {
    throw new RoomError("Falta conectar Vercel Blob (BLOB_READ_WRITE_TOKEN) para guardar la imagen del tablero.", 503);
  }
  // fichas propias: una imagen por color de jugador (o null para dejar el zombi de serie)
  const tokens: (string | null)[] = [];
  for (let i = 0; i < 8; i++) {
    const t = Array.isArray(raw.tokens) ? raw.tokens[i] : null;
    if (t === null || t === undefined) {
      tokens.push(null);
      continue;
    }
    const tm = typeof t === "string" ? /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(t) : null;
    if (!tm) throw new RoomError(`La imagen de la ficha ${i + 1} no es válida.`);
    const tb = Buffer.from(tm[1], "base64");
    if (tb.length > MAX_TOKEN_BYTES) throw new RoomError(`La imagen de la ficha ${i + 1} es demasiado grande.`, 413);
    if (process.env.BLOB_READ_WRITE_TOKEN) tokens.push((await put(`tablero/ficha-${i}-${version}.webp`, tb, { access: "public", contentType: "image/webp" })).url);
    else {
      await getStore().set(TOKEN_KEY(i), tm[1], TEN_YEARS);
      tokens.push(`/api/board/token/${i}?v=${version}`);
    }
  }
  const tokenScale = Array.from({ length: 8 }, (_, i) => {
    const v = Array.isArray(raw.tokenScale) ? raw.tokenScale[i] : 1;
    return typeof v === "number" && Number.isFinite(v) ? Math.min(2.5, Math.max(0.4, v)) : 1;
  });
  const board: PublishedBoard = { ...data, version, image, ...(tokens.some(Boolean) && { tokens, tokenScale }) };
  await getStore().set(PUBLISHED_KEY, JSON.stringify(board), TEN_YEARS);
  return board;
}

/** Vuelve al tablero de serie. */
export async function unpublishBoard() {
  await getStore().del(PUBLISHED_KEY);
}
