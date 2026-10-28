import { loadPublishedLayout } from "@/server/boardDesign";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/** Diseño publicado: la TV lo dibuja en 3D en vivo (null = solo hay imagen). */
export function GET() {
  return handle(async () => ({ layout: await loadPublishedLayout() }));
}
