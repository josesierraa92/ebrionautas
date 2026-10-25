"use client";

import { useState } from "react";
import Marciano from "@/components/Marciano";
import { defaultAvatar, type AvatarConfig } from "@/game/avatar";
import { PLAYER_COLORS } from "@/game/tileStyle";

type Props = { onStart: (players: { name: string; color: string; avatar: AvatarConfig }[]) => void };

export default function Setup({ onStart }: Props) {
  const [names, setNames] = useState(["", ""]);
  const filled = names.map((n) => n.trim()).filter(Boolean);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="title-game text-center text-5xl">NUEVA MESA</h1>
      <p className="text-center text-white/70">
        Juego en una sola pantalla: pasaos el celular o ponedlo en la TV.
      </p>

      <ol className="flex flex-col gap-3">
        {names.map((name, i) => (
          <li key={i} className="flex items-center gap-3">
            <Marciano avatar={defaultAvatar(i, PLAYER_COLORS[i])} size={44} className="shrink-0" />
            <input
              value={name}
              maxLength={16}
              placeholder={`Ebrionauta ${i + 1}`}
              onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
              className="min-w-0 flex-1 rounded-xl border-[3px] border-ink bg-white px-3 py-2 text-lg text-ink outline-none"
            />
            {names.length > 2 && (
              <button
                aria-label={`Quitar jugador ${i + 1}`}
                onClick={() => setNames(names.filter((_, j) => j !== i))}
                className="btn-game size-11 shrink-0 bg-btn-red text-white"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ol>

      {names.length < PLAYER_COLORS.length && (
        <button onClick={() => setNames([...names, ""])} className="btn-game bg-btn-blue py-3 text-xl text-white">
          + AÑADIR EBRIONAUTA
        </button>
      )}

      <button
        disabled={filled.length < 2}
        onClick={() =>
          onStart(
            names
              .map((n, i) => ({ name: n.trim(), color: PLAYER_COLORS[i], avatar: defaultAvatar(i, PLAYER_COLORS[i]) }))
              .filter((p) => p.name),
          )
        }
        className="btn-game bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey"
      >
        ¡DESPEGAR!
      </button>
      {filled.length < 2 && <p className="text-center text-sm text-white/60">Hacen falta al menos 2 jugadores.</p>}
    </main>
  );
}
