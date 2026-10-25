import { handle } from "@/server/http";
import { getRoom } from "@/server/rooms";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return handle(() => getRoom(code));
}
