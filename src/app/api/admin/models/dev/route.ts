import { checkAdmin } from "@/server/boardDesign";
import { saveDevFile } from "@/server/customModels";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/** Solo desarrollo (sin Vercel Blob): sube el .glb como cuerpo de la petición. */
export function PUT(req: Request) {
  return handle(async () => {
    checkAdmin(req.headers.get("x-admin-key"));
    return { url: await saveDevFile(Buffer.from(await req.arrayBuffer())) };
  });
}
