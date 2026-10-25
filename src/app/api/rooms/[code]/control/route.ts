import { handle, readJson } from "@/server/http";
import { claimControl, releaseControl } from "@/server/rooms";

/** Un celular toma el control de la mesa. */
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return handle(() => claimControl(code));
}

/** La TV libera el control para que otro celular lo tome. */
export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readJson(req);
  return handle(() => releaseControl(code, String(body.hostSecret ?? "")));
}
