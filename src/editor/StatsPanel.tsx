"use client";

import { useCallback, useEffect, useState } from "react";
import type { DayStats, Totals } from "@/server/stats";

// Estadísticas de uso para el creador (no para el público): lo que ve en el editor («📊 Estadísticas») y en /admin/stats.
// Los datos son contadores anónimos por día que guarda el servidor (src/server/stats.ts).

export const ADMIN_KEY = "ebrio-editor:clave"; // la misma clave que usa el editor

/** La clave del admin guardada en este navegador; la pide una vez si no está. */
export function askAdminKey(): string {
  let key = localStorage.getItem(ADMIN_KEY);
  if (!key) {
    key = window.prompt("Clave del admin (la variable ADMIN_PASSWORD de Vercel):") ?? "";
    if (key) localStorage.setItem(ADMIN_KEY, key);
  }
  return key;
}

type Data = { days: DayStats[]; totals: Totals };

const pct = (v: number | null) => (v === null ? "—" : `${v} %`);

export default function StatsPanel({ adminKey = askAdminKey }: { adminKey?: () => string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/admin/stats?days=${days}`, { headers: { "x-admin-key": adminKey() } });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      localStorage.removeItem(ADMIN_KEY); // para que vuelva a pedirla
      return setError("Clave de admin incorrecta. Pulsa «Actualizar» para escribirla otra vez.");
    }
    if (!res.ok) return setError(body.error ?? "No se pudieron cargar las estadísticas.");
    setData(body as Data);
  }, [days, adminKey]);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load, tick]);

  const t = data?.totals;
  const cards: { label: string; value: string | number; hint: string }[] = t
    ? [
        { label: "Aparatos nuevos", value: t.edad_si, hint: "Contestaron «tengo 18» por primera vez (≈ gente distinta que llegó)." },
        { label: "Visitas", value: t.visita, hint: "Veces que se abrió el juego (una por pestaña)." },
        { label: "Volvieron otro día", value: t.vuelve, hint: "Visitas de dispositivos que ya habían venido antes: lo más parecido a retención." },
        { label: "Mesas creadas", value: t.mesa, hint: "Veces que alguien pulsó «Crear mesa»." },
        { label: "Celulares conectados", value: t.celular, hint: "Celulares que tomaron el control de una mesa." },
        { label: "Partidas empezadas", value: t.partida, hint: "Mesas donde se pulsó «Empezar» con jugadores." },
        { label: "Partidas en serio", value: `${t.enserio} (${pct(t.enSeriosPct)})`, hint: "Llegaron a 10 tiradas: no fue solo alguien probando. Esta es la cifra de «grupos que juegan de verdad»." },
        { label: "Partidas terminadas", value: `${t.terminada} (${pct(t.terminadasPct)})`, hint: "Alguien ganó la partida completa." },
        { label: "Jugadores por partida", value: t.jugadoresPorPartida ?? "—", hint: "Promedio de jugadores al empezar." },
        { label: "Dijeron que son menores", value: t.edad_no, hint: "Pulsaron «Soy menor de 18»." },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Últimos
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-md bg-white/10 px-2 py-1">
            {[7, 30, 90, 365].map((d) => (
              <option key={d} value={d} className="text-black">
                {d} días
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => setTick((n) => n + 1)}>
          ⟳ Actualizar
        </button>
        <span className="text-xs text-white/50">Contadores anónimos por día (UTC), sin nombres ni IP. Las partidas las cuenta el servidor.</span>
      </div>

      {error && (
        <p role="status" className="rounded-lg bg-rose-500/20 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}
      {!data && !error && <p className="opacity-70">Cargando…</p>}

      {data && (
        <>
          <section className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {cards.map((c) => (
              <div key={c.label} title={c.hint} className="rounded-xl bg-white/10 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-white/60">{c.label}</div>
                <div className="font-display text-2xl text-white">{c.value}</div>
              </div>
            ))}
          </section>
          <p className="text-xs text-white/50">Pasa el ratón por una tarjeta para ver qué cuenta. «Partidas en serio» es la cifra de grupos que juegan de verdad.</p>

          <section className="overflow-x-auto rounded-xl bg-white/5">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className="text-xs uppercase text-white/60">
                <tr>
                  {["Día", "Nuevos", "Visitas", "Volvieron", "Mesas", "Partidas", "En serio", "Terminadas", "Jugadores"].map((h, i) => (
                    <th key={h} className={`px-3 py-2 ${i === 0 ? "text-left" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.days.map((d) => (
                  <tr key={d.day} className="border-t border-white/10">
                    <td className="px-3 py-1.5 text-left">{d.day}</td>
                    <td className="px-3 py-1.5">{d.edad_si}</td>
                    <td className="px-3 py-1.5">{d.visita}</td>
                    <td className="px-3 py-1.5">{d.vuelve}</td>
                    <td className="px-3 py-1.5">{d.mesa}</td>
                    <td className="px-3 py-1.5">{d.partida}</td>
                    <td className="px-3 py-1.5">{d.enserio}</td>
                    <td className="px-3 py-1.5">{d.terminada}</td>
                    <td className="px-3 py-1.5">{d.jugadores}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
