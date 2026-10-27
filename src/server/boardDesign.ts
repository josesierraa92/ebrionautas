// Diseño del tablero hecho con el editor (/admin/editor). Se guarda en el mismo Redis que las mesas.
import { timingSafeEqual } from "node:crypto";
import { parseLayout, type BoardLayout } from "@/editor/layout";
import { RoomError } from "./rooms";
import { getStore } from "./store";

const KEY = "board:design";
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
