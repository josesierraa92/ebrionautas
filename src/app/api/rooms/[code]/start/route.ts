import { handle, readJson } from "@/server/http";
import { startRoom, type NewPlayer } from "@/server/rooms";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readJson(req);
  const players = Array.isArray(body.players) ? (body.players as NewPlayer[]) : [];
  return handle(() => startRoom(code, String(body.secret ?? ""), players, Number(body.cups) || 1));
}
