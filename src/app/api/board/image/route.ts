import { loadDevImage } from "@/server/boardDesign";

export const dynamic = "force-dynamic";

/** Imagen del tablero publicado cuando no hay Vercel Blob (solo en desarrollo). */
export async function GET() {
  const image = await loadDevImage();
  if (!image) return new Response("No hay tablero publicado.", { status: 404 });
  return new Response(new Uint8Array(image), { headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" } });
}
