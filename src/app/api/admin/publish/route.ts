import { checkAdmin, publishBoard, unpublishBoard } from "@/server/boardDesign";
import { handle, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** Publica en la TV el tablero renderizado en el editor. Pide la clave del admin (x-admin-key). */
export function POST(req: Request) {
  return handle(async () => {
    checkAdmin(req.headers.get("x-admin-key"));
    const board = await publishBoard(await readJson(req));
    return { ok: true, version: board.version };
  });
}

/** Quita el tablero publicado: la TV vuelve al de serie. */
export function DELETE(req: Request) {
  return handle(async () => {
    checkAdmin(req.headers.get("x-admin-key"));
    await unpublishBoard();
    return { ok: true };
  });
}
