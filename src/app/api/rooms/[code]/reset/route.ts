import { handle, readJson } from "@/server/http";
import { resetRoom } from "@/server/rooms";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readJson(req);
  return handle(() => resetRoom(code, String(body.secret ?? "")));
}
