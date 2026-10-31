"use client";

import { characterOf } from "@/game/characters";
import { useState } from "react";
import Marciano from "@/components/Marciano";
import { defaultAvatar } from "@/game/avatar";
import type { Gender } from "@/game/engine";
import { PLAYER_COLORS } from "@/game/tileStyle";

type Draft = { name: string; gender: Gender | null };
type Props = {
  onStart: (players: { name: string; gender: Gender }[], cups: number) => void;
  busy?: boolean;
  /** Texto bajo el título (ej. dónde se verá el tablero). */
  hint?: string;
  /** Enseñar la elección de copas (el modo local `/jugar` no tiene rondas). */
  copas?: boolean;
};

/** Alta de participantes: nombre y hombre/mujer (se usa en las casillas Machos y Hembras). */
export default function Setup({ onStart, busy = false, hint, copas = true }: Props) {
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-8">
      <h1 className="title-game text-center text-5xl">LOS MUERTOS</h1>
      {hint && <p className="text-center text-white/70">{hint}</p>}

      <ol className="flex flex-col gap-3">
        {players.map((p, i) => (
          <li key={i} className="flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-ink/70 p-2">
            <Marciano avatar={defaultAvatar(i, PLAYER_COLORS[i])} size={42} className="shrink-0" character={characterOf(players.map((q, j) => ({ id: String(j), gender: q.gender })), String(i))} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <input
                value={p.name}
                maxLength={16}
                placeholder={`Muerto ${i + 1}`}
                aria-label={`Nombre del jugador ${i + 1}`}
                onChange={(e) => set(i, { name: e.target.value })}
                className="min-w-0 rounded-xl border-[3px] border-ink bg-white px-3 py-1.5 text-lg text-ink outline-none"
              />
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={`Género del jugador ${i + 1}`}>
                {(["hombre", "mujer"] as const).map((g) => (
                  <button
                    key={g}
                    aria-pressed={p.gender === g}
                    onClick={() => set(i, { gender: g })}
                    className={`rounded-lg border-2 border-ink py-1 font-display text-sm ${
                      p.gender === g ? (g === "hombre" ? "bg-btn-blue text-white" : "bg-btn-special text-white") : "bg-space text-white/60"
                    }`}
                  >
                    {g === "hombre" ? "♂ HOMBRE" : "♀ MUJER"}
                  </button>
                ))}
              </div>
            </div>
            {players.length > 2 && (
              <button
                aria-label={`Quitar jugador ${i + 1}`}
                onClick={() => setPlayers(players.filter((_, j) => j !== i))}
                className="btn-game size-10 shrink-0 bg-btn-red text-white"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ol>

      {players.length < PLAYER_COLORS.length && (
        <button onClick={() => setPlayers([...players, { name: "", gender: null }])} className="btn-game bg-btn-blue py-3 text-xl text-white">
          + AÑADIR MUERTO
        </button>
      )}

      {copas && (
      <div role="group" aria-label="Copas para ganar" className="rounded-2xl border-[3px] border-ink bg-ink/70 p-3 text-center">
        <p className="font-display text-lg">¿A CUÁNTAS COPAS?</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <button key={n} aria-pressed={cups === n} onClick={() => setCups(n)} className={`rounded-xl border-2 border-ink py-2 font-display text-xl ${cups === n ? "bg-btn-yellow text-white" : "bg-space text-white/60"}`}>
              {"🏆".repeat(n)}
              <span className="block text-sm">{n === 1 ? "1 copa" : `${n} copas`}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-white/70">{cups === 1 ? "El primero que llegue a la meta gana." : `Gana quien consiga ${cups} copas: cada ronda se juega hasta la meta y se reinicia.`}</p>
      </div>
      )}

      <button
        disabled={!ready || busy}
        onClick={() => onStart(filled.map((p) => ({ name: p.name.trim(), gender: p.gender! })), copas ? cups : 1)}
        className="btn-game bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey"
      >
        {busy ? "LEVANTÁNDOSE…" : "¡A LEVANTARSE!"}
      </button>
      <p className="text-center text-sm text-white/60">
        {filled.length < 2
          ? "Hacen falta al menos 2 jugadores."
          : duplicated
            ? "Hay nombres repetidos."
            : missingGender
              ? "Marca hombre o mujer para cada jugador."
              : "Juego para mayores de 18 años. Bebe con moderación."}
      </p>
    </main>
  );
}
