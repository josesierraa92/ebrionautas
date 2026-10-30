import { checkAdmin, saveCardTexts } from "@/server/boardDesign";
import { saveLists } from "@/server/lists";
import { handle, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** Guarda los textos de las tarjetas. Pide la clave del admin en la cabecera x-admin-key. */
export function PUT(req: Request) {
  return handle(async () => {
    checkAdmin(req.headers.get("x-admin-key"));
    const body = await readJson(req);
    return { cards: await saveCardTexts(body.cards), ...(await saveLists(body)) };
  });
}
