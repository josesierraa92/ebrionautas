// Modelos 3D propios que el admin sube desde el editor (/admin/editor). Los archivos .glb van a Vercel Blob (el
// navegador los sube directo, así no chocan con el límite de tamaño de las funciones) y aquí solo se guarda la lista.
// Sin Blob (solo desarrollo), el .glb se guarda en el almacén y lo sirve /api/models/file/<id>.
import { del } from "@vercel/blob";
import { RoomError } from "./rooms";
import { getStore } from "./store";

export type CustomModel = {
  /** "mios/<id>": mismo formato que los del catálogo, así los objetos del tablero lo guardan igual. */
  id: string;
  name: string;
  url: string;
  /** Miniatura 128×128 (data URL webp). */
  thumb: string;
  /** Tamaño con el que entra al tablero, calculado al subirlo. */
  scale: number;
};

const KEY = "board:models";
const FILE_KEY = (id: string) => `board:model:${id}`;
const TEN_YEARS = 10 * 365 * 24 * 3600;
export const MAX_MODELS = 80;
export const MAX_MODEL_BYTES = 30 * 1024 * 1024;
export const MAX_DEV_BYTES = 6 * 1024 * 1024;

/** ¿Hay Vercel Blob? Si no (desarrollo), los archivos van al almacén. */
export const blobConfigured = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function listModels(): Promise<CustomModel[]> {
  const raw = await getStore().get(KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as CustomModel[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const slug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "modelo";

function validUrl(url: string) {
  return /^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\//.test(url) || /^\/api\/models\/file\/[\w-]+$/.test(url);
}

export async function addModel(raw: Record<string, unknown>): Promise<CustomModel> {
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 40) : "";
  const url = typeof raw.url === "string" ? raw.url : "";
  const thumb = typeof raw.thumb === "string" ? raw.thumb : "";
  const scale = typeof raw.scale === "number" && Number.isFinite(raw.scale) ? Math.min(50, Math.max(0.01, raw.scale)) : 1;
  if (!name) throw new RoomError("Ponle un nombre al modelo.");
  if (!validUrl(url)) throw new RoomError("La dirección del modelo no es válida.");
  if (!/^data:image\/webp;base64,[A-Za-z0-9+/=]{20,60000}$/.test(thumb)) throw new RoomError("La miniatura no es válida.");
  const list = await listModels();
  if (list.length >= MAX_MODELS) throw new RoomError(`Ya hay ${MAX_MODELS} modelos propios: borra alguno antes de subir otro.`);
  if (list.some((m) => m.url === url)) throw new RoomError("Ese modelo ya está en la lista.");
  const id = `mios/${slug(name)}-${Math.random().toString(36).slice(2, 6)}`;
  const model: CustomModel = { id, name, url, thumb, scale };
  await getStore().set(KEY, JSON.stringify([...list, model]), TEN_YEARS);
  return model;
}

export async function removeModel(id: string) {
  const list = await listModels();
  const model = list.find((m) => m.id === id);
  if (!model) throw new RoomError("Ese modelo no existe.", 404);
  await getStore().set(KEY, JSON.stringify(list.filter((m) => m.id !== id)), TEN_YEARS);
  if (model.url.startsWith("/api/")) await getStore().del(FILE_KEY(model.url.split("/").pop()!));
  else if (blobConfigured())
    try {
      await del(model.url);
    } catch {
      /* si el archivo ya no estaba, no importa: la lista ya quedó limpia */
    }
}

/** Solo desarrollo: guarda el .glb en el almacén y devuelve su dirección. */
export async function saveDevFile(bytes: Buffer): Promise<string> {
  if (blobConfigured() || process.env.NODE_ENV === "production") throw new RoomError("Esta ruta es solo para desarrollo sin Vercel Blob.", 403);
  if (bytes.length > MAX_DEV_BYTES) throw new RoomError("El modelo es demasiado grande para la prueba local.", 413);
  if (bytes.toString("ascii", 0, 4) !== "glTF") throw new RoomError("El archivo no es un .glb válido.");
  const id = Math.random().toString(36).slice(2, 12);
  await getStore().set(FILE_KEY(id), bytes.toString("base64"), TEN_YEARS);
  return `/api/models/file/${id}`;
}

export async function loadDevFile(id: string): Promise<Buffer | null> {
  const raw = await getStore().get(FILE_KEY(id));
  return raw ? Buffer.from(raw, "base64") : null;
}
