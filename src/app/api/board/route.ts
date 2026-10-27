import { loadPublished } from "@/server/boardDesign";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/** Tablero publicado que usa la TV (null = el de serie). */
export function GET() {
  return handle(async () => ({ board: await loadPublished() }));
}
