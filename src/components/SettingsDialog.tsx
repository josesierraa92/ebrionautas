"use client";

// Ajustes de la partida (celular): quitar vasos contados de más y sacar a un jugador que se fue. Se abre con el botón ⚙️ AJUSTES.
import { useState } from "react";
import type { Action, GameState } from "@/game/engine";

export default function SettingsDialog({ game, busy, onAction, onClose }: { game: GameState; busy: boolean; onAction: (a: Action) => void; onClose: () => void }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const finished = game.phase === "FINISHED";
  const canRemove = game.players.length > 2 && !finished;
  const active = game.players.filter((p) => !p.paused).length;
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-space" role="dialog" aria-modal="true" aria-label="Ajustes de la partida">
      <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl">⚙️ Ajustes</span>
          <button onClick={onClose} className="btn-game bg-btn-yellow px-4 py-1 text-white">
            ✕ LISTO
          </button>
        </div>
        <p className="text-sm text-white/70">Quita un vaso a quien se le contó de más, pon en pausa a quien se ausenta un rato (se salta su turno) o saca a quien ya no está jugando.</p>
        <ul className="flex flex-col gap-2">
          {game.players.map((p) => (
            <li key={p.id} className="rounded-2xl border-[3px] border-ink bg-ink/70 p-2.5">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl uppercase">
                    {p.name} {p.paused && <span className="text-sm text-btn-yellow">⏸ EN PAUSA</span>}
                  </p>
                  <p className="text-sm text-white/70">
                    Lleva <b>{p.drunk}</b> {p.drunk === 1 ? "vaso" : "vasos"}
                    {p.pending > 0 && <> · debe <b>{p.pending}</b></>}
                  </p>
                </div>
                <button
                  disabled={busy || p.drunk <= 0}
                  onClick={() => onAction({ type: "REMOVE_DRINK", id: p.id })}
                  className="btn-game shrink-0 bg-btn-red px-3 py-2 text-white disabled:opacity-40"
                  aria-label={`Quitar un vaso a ${p.name}`}
                >
                  − 1 VASO
                </button>
              </div>
              {!finished && (p.paused || active > 1) && (
                <button
                  disabled={busy}
                  onClick={() => onAction({ type: "PAUSE_PLAYER", id: p.id, paused: !p.paused })}
                  className={`btn-game mt-2 w-full px-3 py-1.5 text-white ${p.paused ? "bg-btn-green" : "bg-btn-yellow"}`}
                >
                  {p.paused ? "▶ VOLVER A JUGAR" : "⏸ PONER EN PAUSA"}
                </button>
              )}
              {canRemove &&
                (confirm === p.id ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="flex-1 text-sm text-btn-yellow">¿Sacar a {p.name} de la partida?</span>
                    <button disabled={busy} onClick={() => { onAction({ type: "REMOVE_PLAYER", id: p.id }); setConfirm(null); }} className="btn-game bg-btn-red px-3 py-1 text-white">
                      SÍ, SACAR
                    </button>
                    <button onClick={() => setConfirm(null)} className="btn-game bg-btn-grey px-3 py-1 text-white">
                      NO
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirm(p.id)} className="mt-2 text-sm text-white/60 underline">
                    🚪 {p.name} se fue de la partida
                  </button>
                ))}
            </li>
          ))}
        </ul>
        {!canRemove && <p className="text-xs text-white/50">{finished ? "Con la partida terminada solo se pueden quitar vasos." : "Hacen falta al menos 2 jugadores."}</p>}
      </div>
    </div>
  );
}
