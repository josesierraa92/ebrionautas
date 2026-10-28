import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { checkAdmin } from "@/server/boardDesign";
import { MAX_MODEL_BYTES } from "@/server/customModels";
import { RoomError } from "@/server/rooms";

export const dynamic = "force-dynamic";

/** Da permiso al navegador del admin para subir un .glb directo a Vercel Blob (la clave viaja en clientPayload). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        checkAdmin(clientPayload);
        if (!/^modelos\/[\w .()-]+\.glb$/i.test(pathname)) throw new RoomError("Solo se pueden subir archivos .glb.");
        return { allowedContentTypes: ["model/gltf-binary", "application/octet-stream"], maximumSizeInBytes: MAX_MODEL_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    const status = e instanceof RoomError ? e.status : 400;
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo subir." }, { status });
  }
}
