import { loadCardTexts } from "@/server/boardDesign";
import { loadLists } from "@/server/lists";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

/** Textos de las tarjetas que cambió el admin (la TV y el celular los piden al abrir la partida). */
export function GET() {
  return handle(async () => ({ cards: await loadCardTexts(), ...(await loadLists()) }));
}
