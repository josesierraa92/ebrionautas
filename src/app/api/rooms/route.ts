import { handle, readJson } from "@/server/http";
import { createRoom } from "@/server/rooms";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson(req);
  return handle(() => createRoom(body.mode === "online" ? "online" : "local"));
}
