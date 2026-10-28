import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { checkAdmin } from "@/server/boardDesign";
import { RoomError } from "@/server/rooms";

export const dynamic = "force-dynamic";

/** Da permiso al navegador del admin para subir la imagen del tablero (grande) directo a Vercel Blob. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        checkAdmin(clientPayload);
        if (!/^tablero\/[\w.-]+\.webp$/.test(pathname)) throw new RoomError("Solo se puede subir la imagen del tablero.");
        return { allowedContentTypes: ["image/webp"], maximumSizeInBytes: 20_000_000, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    const status = e instanceof RoomError ? e.status : 400;
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo subir." }, { status });
  }
}
