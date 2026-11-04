import { handle, readJson } from "@/server/http";
import { getRoom, startOnline, startRoom, type NewPlayer } from "@/server/rooms";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readJson(req);
  const players = Array.isArray(body.players) ? (body.players as NewPlayer[]) : [];
  return handle(async () => {
    const cups = Number(body.cups) || 1;
    if ((await getRoom(code)).mode === "online") return startOnline(code, String(body.secret ?? ""), cups);
    return startRoom(code, String(body.secret ?? ""), players, cups);
  });
}
