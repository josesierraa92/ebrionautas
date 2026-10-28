// Subir un modelo propio (.glb) desde el editor: lo dibuja para sacar su miniatura, calcula con qué tamaño entra al
// tablero, lo sube (directo a Vercel Blob, o al almacén en desarrollo) y lo apunta en la lista del servidor.
import { upload } from "@vercel/blob/client";
import { defaultScaleFor, parseModelFile, renderThumb } from "./modelRender";

export type CustomModel = { id: string; name: string; url: string; thumb: string; scale: number };

export const MAX_UPLOAD_MB = 30;

/** Nombre sugerido a partir del archivo: sin la extensión ni guiones. */
export const nameFromFile = (file: File) =>
  file.name
    .replace(/\.glb$/i, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, 40) || "Modelo";

export async function uploadModel(file: File, name: string, adminKey: string, mode: "blob" | "dev", onStep: (msg: string) => void): Promise<CustomModel> {
  if (!/\.glb$/i.test(file.name)) throw new Error("Solo se pueden subir archivos .glb (en Poly Pizza y Kenney sale como «GLB» o «GLTF»).");
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`El archivo pesa más de ${MAX_UPLOAD_MB} MB.`);
  onStep("Leyendo el modelo…");
  let root;
  try {
    root = await parseModelFile(file);
  } catch {
    throw new Error("No se pudo leer el archivo: ¿es un .glb de verdad?");
  }
  const thumb = renderThumb(root);
  const scale = defaultScaleFor(root);

  onStep("Subiendo…");
  let url: string;
  if (mode === "blob") {
    const safe = file.name.replace(/[^\w .()-]/g, "_");
    const blob = await upload(`modelos/${safe}`, file, {
      access: "public",
      handleUploadUrl: "/api/admin/models/upload",
      clientPayload: adminKey,
      contentType: "model/gltf-binary",
      multipart: file.size > 8 * 1024 * 1024, // los archivos grandes se suben en partes
    });
    url = blob.url;
  } else {
    const res = await fetch("/api/admin/models/dev", { method: "PUT", headers: { "x-admin-key": adminKey }, body: file });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "No se pudo subir.");
    url = body.url;
  }

  onStep("Guardando en la lista…");
  const res = await fetch("/api/admin/models", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify({ name, url, thumb, scale }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "No se pudo guardar el modelo.");
  return body.model as CustomModel;
}
