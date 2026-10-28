import { handle } from "@/server/http";
import { blobConfigured, listModels } from "@/server/customModels";

export const dynamic = "force-dynamic";

/** Modelos propios del admin (para el catálogo del editor) y si se suben a Vercel Blob o al almacén (desarrollo). */
export function GET() {
  return handle(async () => ({ models: await listModels(), mode: blobConfigured() ? "blob" : "dev" }));
}
