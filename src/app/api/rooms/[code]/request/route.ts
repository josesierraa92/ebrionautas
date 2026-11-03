import { handle } from "@/server/http";
import { requestControl } from "@/server/rooms";

export const dynamic = "force-dynamic";

/** Un celular pide el control de una mesa que ya tiene dueño: la TV enseña un aviso con «liberar». */
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return handle(() => requestControl(code));
}
