import { NextResponse } from "next/server";
import { CLIENT_EVENTS, track, type StatEvent } from "@/server/stats";
import { readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** El navegador avisa de un evento anónimo (aviso de +18, visita). Solo acepta los de la lista. */
export async function POST(req: Request) {
  const body = await readJson(req);
  const ev = String(body.event ?? "");
  if (!(CLIENT_EVENTS as readonly string[]).includes(ev)) return NextResponse.json({ error: "Evento desconocido." }, { status: 400 });
  await track(ev as StatEvent);
  return new NextResponse(null, { status: 204 });
}
