import { loadDevToken } from "@/server/boardDesign";

export const dynamic = "force-dynamic";

/** Imagen de una ficha publicada cuando no hay Vercel Blob (solo en desarrollo). */
export async function GET(_req: Request, { params }: { params: Promise<{ i: string }> }) {
  const { i } = await params;
  const image = await loadDevToken(Number(i));
  if (!image) return new Response("No hay ficha.", { status: 404 });
  return new Response(new Uint8Array(image), { headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" } });
}
