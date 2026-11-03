"use client";

// Ajustes de la partida (celular): quitar vasos contados de más, pausar a quien se ausenta y sacar a un jugador que se fue. Se abre con el botón AJUSTES.
// Usa el diseño de las tarjetas (`CardPanel`); los nombres van grandes para leerse de noche.
import { useState } from "react";
import CardPanel, { CardText, GREEN_LIGHT } from "@/components/CardPanel";
import type { Action, GameState } from "@/game/engine";

const u = (k: number) => `calc(var(--u) * ${k})`;
const body = { fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700 } as const;

export default function SettingsDialog({ game, busy, onAction, onClose }: { game: GameState; busy: boolean; onAction: (a: Action) => void; onClose: () => void }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const finished = game.phase === "FINISHED";
  const canRemove = game.players.length > 2 && !finished;
  const active = game.players.filter((p) => !p.paused).length;
  return (
    <CardPanel
      kicker="Partida"
      title="Ajustes"
      centerTitle
      unit="17px"
      z="z-[60]"
      label="Ajustes de la partida"
      onClose={onClose}
      actions={
        <button onClick={onClose} className="btn-game w-full bg-btn-green py-3 text-2xl text-white">
          LISTO
        </button>
      }
    >
      <CardText size={1}>Quita un vaso a quien se le contó de más, pon en pausa a quien se ausenta un rato (se salta su turno) o saca a quien ya no está jugando.</CardText>
      <ul className="flex flex-col" style={{ gap: u(0.7), marginTop: u(0.9) }}>
        {game.players.map((p) => (
          <li key={p.id} style={{ padding: u(0.8), borderRadius: u(1), background: "rgba(255,255,255,.08)" }}>
            <div className="flex items-center" style={{ gap: u(0.7) }}>
              <div className="min-w-0 flex-1">
                <p className="font-display uppercase leading-[1.02] text-white" style={{ fontSize: u(p.name.length <= 8 ? 1.9 : p.name.length <= 12 ? 1.6 : 1.35), overflowWrap: "break-word" }}>
                  {p.name}
                </p>
                {p.paused && (
                  <span className="font-display uppercase" style={{ fontSize: u(0.85), color: GREEN_LIGHT }}>
                    En pausa
                  </span>
                )}
                <p style={{ ...body, fontSize: u(1), color: "#d8d4f6", marginTop: u(0.2) }}>
                  Lleva <b className="text-white">{p.drunk}</b> {p.drunk === 1 ? "vaso" : "vasos"}
                  {p.pending > 0 && (
                    <>
                      {" "}· debe <b className="text-white">{p.pending}</b>
                    </>
                  )}
                </p>
              </div>
              <button
                disabled={busy || p.drunk <= 0}
                onClick={() => onAction({ type: "REMOVE_DRINK", id: p.id })}
                className="btn-game shrink-0 bg-btn-red px-3 py-2 text-white disabled:opacity-40"
                style={{ fontSize: u(1.1) }}
                aria-label={`Quitar un vaso a ${p.name}`}
              >
                − 1 VASO
              </button>
            </div>
            {!finished && (p.paused || active > 1) && (
              <button
                disabled={busy}
                onClick={() => onAction({ type: "PAUSE_PLAYER", id: p.id, paused: !p.paused })}
                className={`btn-game w-full px-3 py-1.5 text-white ${p.paused ? "bg-btn-green" : "bg-btn-special"}`}
                style={{ marginTop: u(0.6), fontSize: u(1.1) }}
              >
                {p.paused ? "VOLVER A JUGAR" : "PONER EN PAUSA"}
              </button>
            )}
            {canRemove &&
              (confirm === p.id ? (
                <div className="flex items-center" style={{ gap: u(0.6), marginTop: u(0.6) }}>
                  <span className="flex-1" style={{ ...body, fontSize: u(1), color: GREEN_LIGHT }}>¿Sacar a {p.name} de la partida?</span>
                  <button disabled={busy} onClick={() => { onAction({ type: "REMOVE_PLAYER", id: p.id }); setConfirm(null); }} className="btn-game bg-btn-red px-3 py-1 text-white" style={{ fontSize: u(1) }}>
                    SÍ, SACAR
                  </button>
                  <button onClick={() => setConfirm(null)} className="btn-game bg-btn-grey px-3 py-1 text-white" style={{ fontSize: u(1) }}>
                    NO
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirm(p.id)} className="underline" style={{ ...body, marginTop: u(0.6), fontSize: u(0.95), color: "#d8d4f6", opacity: 0.75 }}>
                  {p.name} se fue de la partida
                </button>
              ))}
          </li>
        ))}
      </ul>
      {!canRemove && <p style={{ ...body, fontSize: u(0.9), color: "#d8d4f6", opacity: 0.6, marginTop: u(0.7) }}>{finished ? "Con la partida terminada solo se pueden quitar vasos." : "Hacen falta al menos 2 jugadores."}</p>}
    </CardPanel>
  );
}
