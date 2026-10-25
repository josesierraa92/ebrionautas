import { handle, readJson } from "@/server/http";
import { joinRoom } from "@/server/rooms";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readJson(req);
  return handle(() => joinRoom(code, String(body.name ?? ""), body.avatar));
}
