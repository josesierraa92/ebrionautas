import { checkAdmin } from "@/server/boardDesign";
import { addModel, removeModel } from "@/server/customModels";
import { handle, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** Apunta en la lista un modelo que el navegador ya subió. Pide la clave del admin (x-admin-key). */
export function POST(req: Request) {
  return handle(async () => {
    checkAdmin(req.headers.get("x-admin-key"));
    return { model: await addModel(await readJson(req)) };
  });
}

/** Borra un modelo propio (de la lista y de Vercel Blob): ?id=mios/<nombre>. */
export function DELETE(req: Request) {
  return handle(async () => {
    checkAdmin(req.headers.get("x-admin-key"));
    await removeModel(new URL(req.url).searchParams.get("id") ?? "");
  });
}
