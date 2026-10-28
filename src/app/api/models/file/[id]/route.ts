import { loadDevFile } from "@/server/customModels";

export const dynamic = "force-dynamic";

/** .glb guardado en el almacén (solo desarrollo, sin Vercel Blob). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = /^[\w-]+$/.test(id) ? await loadDevFile(id) : null;
  if (!file) return new Response("No existe.", { status: 404 });
  return new Response(new Uint8Array(file), { headers: { "content-type": "model/gltf-binary", "cache-control": "public, max-age=31536000, immutable" } });
}
