import { checkAdmin } from "@/server/boardDesign";
import { handle } from "@/server/http";
import { loadStats, totalsOf } from "@/server/stats";

export const dynamic = "force-dynamic";

/** Estadísticas por día y totales. Pide la clave del admin en la cabecera x-admin-key. */
export function GET(req: Request) {
  return handle(async () => {
    checkAdmin(req.headers.get("x-admin-key"));
    const days = Number(new URL(req.url).searchParams.get("days")) || 30;
    const rows = await loadStats(days);
    return { days: rows, totals: totalsOf(rows) };
  });
}
