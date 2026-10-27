import { checkAdmin, loadDesign, saveDesign } from "@/server/boardDesign";
import { handle, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** Diseño guardado del tablero (o null si aún no hay). */
export function GET() {
  return handle(async () => ({ layout: await loadDesign() }));
}

/** Guarda el diseño. Pide la clave del admin en la cabecera x-admin-key. */
export function PUT(req: Request) {
  return handle(async () => {
    checkAdmin(req.headers.get("x-admin-key"));
    const body = await readJson(req);
    await saveDesign(body.layout);
    return { ok: true };
  });
}
