// Estadísticas de uso, sin datos personales: solo contadores por día (nada de nombres, IP ni identificadores).
// Sirven para saber cuántos grupos juegan de verdad: cuántas mesas se crean, cuántas partidas empiezan, cuántas llegan
// a jugarse en serio y cuántas terminan. Se guardan en el mismo almacén que las mesas (Redis).

import { getStore } from "./store";

/** Eventos que cuenta el servidor al ver la jugada y que el cliente no puede inventar. */
export const SERVER_EVENTS = ["mesa", "celular", "partida", "jugadores", "enserio", "terminada"] as const;
/** Eventos que avisa el navegador (aviso de +18 y visitas). */
export const CLIENT_EVENTS = ["edad_si", "edad_no", "visita", "vuelve"] as const;
export const ALL_EVENTS = [...SERVER_EVENTS, ...CLIENT_EVENTS] as const;
export type StatEvent = (typeof ALL_EVENTS)[number];

/** Tiradas a partir de las cuales una partida cuenta como «en serio» (no solo alguien probando). */
export const SERIOUS_ROLLS = 10;

const KEEP_DAYS = 400;
const key = (day: string, ev: StatEvent) => `stats:${day}:${ev}`;

/** Día en UTC (YYYY-MM-DD). */
export function dayOf(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Cuenta un evento. Nunca debe romper el juego: si el almacén falla, se ignora. */
export async function track(ev: StatEvent, n = 1): Promise<void> {
  try {
    await getStore().incr(key(dayOf(), ev), n);
  } catch (e) {
    console.error("stats:", (e as Error).message);
  }
}

export type DayStats = { day: string } & Record<StatEvent, number>;

/** Los últimos `days` días, del más reciente al más antiguo. */
export async function loadStats(days: number, now = new Date()): Promise<DayStats[]> {
  const n = Math.max(1, Math.min(KEEP_DAYS, Math.floor(days) || 30));
  const store = getStore();
  const out: DayStats[] = [];
  for (let i = 0; i < n; i++) {
    const day = dayOf(new Date(now.getTime() - i * 86400000));
    const values = await Promise.all(ALL_EVENTS.map((ev) => store.get(key(day, ev))));
    out.push({ day, ...(Object.fromEntries(ALL_EVENTS.map((ev, k) => [ev, Number(values[k] ?? 0)])) as Record<StatEvent, number>) });
  }
  return out;
}

export type Totals = Record<StatEvent, number> & {
  /** % de partidas empezadas que llegaron hasta la meta */
  terminadasPct: number | null;
  /** % de partidas empezadas que pasaron de las tiradas mínimas */
  enSeriosPct: number | null;
  /** jugadores por partida */
  jugadoresPorPartida: number | null;
};

export function totalsOf(rows: DayStats[]): Totals {
  const t = Object.fromEntries(ALL_EVENTS.map((ev) => [ev, rows.reduce((a, r) => a + r[ev], 0)])) as Record<StatEvent, number>;
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
  return {
    ...t,
    terminadasPct: pct(t.terminada, t.partida),
    enSeriosPct: pct(t.enserio, t.partida),
    jugadoresPorPartida: t.partida > 0 ? Math.round((t.jugadores / t.partida) * 10) / 10 : null,
  };
}
