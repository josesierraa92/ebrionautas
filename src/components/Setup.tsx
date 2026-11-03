"use client";

import { characterOf } from "@/game/characters";
import { useState } from "react";
import CardPanel from "@/components/CardPanel";
import Logo from "@/components/Logo";
import Marciano from "@/components/Marciano";
import TrophyIcon from "@/components/TrophyIcon";
import { defaultAvatar } from "@/game/avatar";
import type { Gender } from "@/game/engine";
import { PLAYER_COLORS } from "@/game/tileStyle";

type Draft = { name: string; gender: Gender | null };
type Props = {
  onStart: (players: { name: string; gender: Gender }[], cups: number) => void;
  busy?: boolean;
  /** Código de la mesa: sale arriba a la derecha, frente al logo. */
  code?: string;
  /** Enseñar la elección de copas (el modo local `/jugar` no tiene rondas). */
  copas?: boolean;
};

/** Alta de participantes: nombre y hombre/mujer (se usa en las casillas Machos y Hembras). */
export default function Setup({ onStart, busy = false, code, copas = true }: Props) {
  const [players, setPlayers] = useState<Draft[]>([
    { name: "", gender: null },
    { name: "", gender: null },
  ]);
  const [cups, setCups] = useState(1);
  const set = (i: number, patch: Partial<Draft>) => setPlayers(players.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const filled = players.filter((p) => p.name.trim());
  const names = filled.map((p) => p.name.trim().toLowerCase());
  const duplicated = new Set(names).size !== names.length;
  const missingGender = filled.some((p) => !p.gender);
  const ready = filled.length >= 2 && !duplicated && !missingGender;

  const u = (k: number) => `calc(var(--u) * ${k})`;
  const rowBg = "rgba(255,255,255,.08)";
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 py-6">
      {/* logo a la izquierda y código de mesa a la derecha, del ancho de la tarjeta */}
      <div className="flex w-full items-center justify-between gap-3" style={{ maxWidth: "calc(17px * 24)" }}>
        <Logo className="w-44 shrink-0" />
        {code && (
          <span className="font-display uppercase" style={{ padding: "0.2rem 0.9rem", borderRadius: 999, background: "linear-gradient(160deg, #bffa58, #5fc34a)", color: "#14260a", fontSize: "1.15rem", letterSpacing: "0.08em" }}>
            Mesa {code}
          </span>
        )}
      </div>
      <CardPanel
        inline
        unit="17px"
        width={24}
        maxH="none" /* formulario largo: la página se desplaza entera */
        kicker="Los muertos"
        title="¿Quién juega?"
        actions={
          <>
            <button
              disabled={!ready || busy}
              onClick={() => onStart(filled.map((p) => ({ name: p.name.trim(), gender: p.gender! })), copas ? cups : 1)}
              className="btn-game bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey"
            >
              {busy ? "LEVANTÁNDOSE…" : "¡A LEVANTARSE!"}
            </button>
            <p className="text-center text-sm" style={{ color: "#d8d4f6", opacity: 0.75, fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700 }}>
              {filled.length < 2
                ? "Hacen falta al menos 2 jugadores."
                : duplicated
                  ? "Hay nombres repetidos."
                  : missingGender
                    ? "Marca hombre o mujer para cada jugador."
                    : "Juego para mayores de 18 años. Bebe con moderación."}
            </p>
          </>
        }
      >
        <ol className="flex flex-col" style={{ marginTop: u(0.8), gap: u(0.6) }}>
          {players.map((p, i) => (
            <li key={i} className="flex items-center gap-2 p-2" style={{ background: rowBg, borderRadius: u(0.9) }}>
              <Marciano avatar={defaultAvatar(i, PLAYER_COLORS[i])} size={42} className="shrink-0" character={characterOf(players.map((q, j) => ({ id: String(j), gender: q.gender })), String(i))} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <input
                  value={p.name}
                  maxLength={16}
                  placeholder={`Muerto ${i + 1}`}
                  aria-label={`Nombre del jugador ${i + 1}`}
                  onChange={(e) => set(i, { name: e.target.value })}
                  className="min-w-0 rounded-xl bg-white px-3 py-1.5 text-lg text-ink outline-none"
                />
                <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={`Género del jugador ${i + 1}`}>
                  {(["hombre", "mujer"] as const).map((g) => (
                    <button
                      key={g}
                      aria-pressed={p.gender === g}
                      onClick={() => set(i, { gender: g })}
                      className={`rounded-lg py-1 font-display text-sm ${p.gender === g ? (g === "hombre" ? "bg-btn-blue text-white" : "bg-btn-special text-white") : "bg-black/30 text-white/60"}`}
                    >
                      {g === "hombre" ? "♂ HOMBRE" : "♀ MUJER"}
                    </button>
                  ))}
                </div>
              </div>
              {players.length > 2 && (
                <button aria-label={`Quitar jugador ${i + 1}`} onClick={() => setPlayers(players.filter((_, j) => j !== i))} className="btn-game size-10 shrink-0 bg-btn-red text-white">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ol>

        {players.length < PLAYER_COLORS.length && (
          <button onClick={() => setPlayers([...players, { name: "", gender: null }])} className="btn-game w-full bg-btn-blue py-3 text-xl text-white" style={{ marginTop: u(0.8) }}>
            + AÑADIR MUERTO
          </button>
        )}

        {copas && (
          <div role="group" aria-label="Copas para ganar" className="p-3 text-center" style={{ marginTop: u(0.8), background: rowBg, borderRadius: u(0.9) }}>
            <p className="font-display text-lg uppercase" style={{ color: "#bffa58" }}>¿A cuántas copas?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  aria-pressed={cups === n}
                  onClick={() => setCups(n)}
                  className={`rounded-xl py-2 font-display text-xl ${cups === n ? "text-[#14260a]" : "bg-black/30 text-white/60"}`}
                  style={cups === n ? { background: "linear-gradient(160deg, #bffa58, #5fc34a)" } : undefined}
                >
                  <span className="flex justify-center gap-0.5">{Array.from({ length: n }, (_, i) => <TrophyIcon key={i} size={26} />)}</span>
                  <span className="block text-sm">{n === 1 ? "1 copa" : `${n} copas`}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm" style={{ color: "#d8d4f6", opacity: 0.8, fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700 }}>
              {cups === 1 ? "El primero que llegue a la meta gana." : `Gana quien consiga ${cups} copas: cada ronda se juega hasta la meta y se reinicia.`}
            </p>
          </div>
        )}
      </CardPanel>
    </main>
  );
}
