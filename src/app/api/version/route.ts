export const dynamic = "force-dynamic";

/** Versión que está publicada ahora (el commit en Vercel); la TV la consulta para recargarse sola cuando cambia. */
export function GET() {
  return Response.json({ id: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" }, { headers: { "cache-control": "no-store" } });
}
