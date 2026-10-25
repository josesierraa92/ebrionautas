import type { Action } from "@/game/engine";
import { handle, readJson } from "@/server/http";
import { RoomError, actInRoom } from "@/server/rooms";

const ACTION_TYPES = new Set<Action["type"]>([
  "ROLL",
  "DISTRIBUTE",
  "DUEL",
  "PATINAZO",
  "SET_RULE",
  "SELECT_DRINKERS",
  "CHOOSE_SLAVE",
  "CARCEL",
  "DRANK",
  "PENALTY",
]);

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readJson(req);
  return handle(async () => {
    const action = body.action as Action | undefined;
    if (!action || typeof action !== "object" || !ACTION_TYPES.has(action.type)) throw new RoomError("Acción desconocida.");
    // El motor valida el contenido de cada acción y devuelve el mismo estado si no es válida.
    await actInRoom(code, String(body.secret ?? ""), action);
  });
}
