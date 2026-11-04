import { handle, readJson } from "@/server/http";
import { joinRoom, leaveRoom, type NewPlayer } from "@/server/rooms";

/** Online: entrar a la sala (POST) o salir / sacar a alguien de ella (DELETE). */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readJson(req);
  return handle(() => joinRoom(code, { name: String(body.name ?? ""), gender: body.gender, look: typeof body.look === "number" ? body.look : undefined } as NewPlayer, typeof body.hostSecret === "string" ? body.hostSecret : undefined));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readJson(req);
  return handle(() => leaveRoom(code, String(body.secret ?? ""), typeof body.memberId === "string" ? body.memberId : undefined));
}
