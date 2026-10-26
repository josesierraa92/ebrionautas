"use client";

import { useEffect, useRef, useState } from "react";
import { Die } from "@/components/Fx";
import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { currentPlayer, jailBail, type GameState } from "@/game/engine";
import { duelOutcome } from "@/game/rules";
import { useShake } from "@/lib/useShake";

const RESULT_MS = 2200;
const DUEL_MS = 5000;

type Props = {
  game: GameState;
  busy: boolean;
  onRoll: () => void;
  /** Lo que se enseña cuando hay que decidir algo (tras mostrar el resultado del dado). */
  decision?: React.ReactNode;
};

/**
 * Pantalla del celular en la fase de tirar: un dado gigante que se tira agitando el
 * celular o tocándolo, de quién es el turno y a quién se le pasa después.
 */
export default function DiceController({ game, busy, onRoll, decision }: Props) {
  const me = currentPlayer(game);
  const next = game.players[(game.turn + 1) % game.players.length];
  const [face, setFace] = useState(1);
  const [result, setResult] = useState<{ value: number; name: string; key: number; lost: boolean; jailed: boolean } | null>(null);
  const roller = useRef(me.name);
  const wasLost = useRef(false); // tiró estando perdido en los asteroides
  const wasJailed = useRef(false); // tiró estando en el calabozo
  const seenRoll = useRef(game.rollSeq);

  const [duel, setDuel] = useState<string | null>(null);
  const canRoll = game.phase === "ROLL" && !busy && !result && !duel;
  const roll = () => {
    if (!canRoll) return;
    roller.current = me.name;
    wasLost.current = me.status.laberinto;
    wasJailed.current = !!me.status.carcel;
    navigator.vibrate?.(80);
    onRoll();
  };
  const shake = useShake(roll, canRoll);

  // Mientras se espera la respuesta, el dado da vueltas con caras al azar.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 80);
    return () => clearInterval(id);
  }, [busy]);

  // Al llegar una tirada nueva, se enseña el resultado un momento antes de pasar el turno.
  useEffect(() => {
    if (game.rollSeq === seenRoll.current) return;
    seenRoll.current = game.rollSeq;
    if (!game.lastRoll) return;
    setResult({ value: game.lastRoll, name: roller.current, key: game.rollSeq, lost: wasLost.current, jailed: wasJailed.current });
    wasLost.current = false;
    wasJailed.current = false;
    navigator.vibrate?.([40, 60, 40]);
    const t = setTimeout(() => setResult(null), RESULT_MS);
    return () => clearTimeout(t);
  }, [game.rollSeq, game.lastRoll]);

  // Duelo resuelto: se enseña quién sacó cuánto y quién bebe.
  const seenDuel = useRef(game.lastDuel?.seq);
  useEffect(() => {
    if (game.lastDuel?.seq === seenDuel.current) return;
    seenDuel.current = game.lastDuel?.seq;
    const text = duelOutcome(game)?.text;
    if (!text) return;
    setDuel(text);
    navigator.vibrate?.([40, 60, 40]);
    const t = setTimeout(() => setDuel(null), DUEL_MS);
    return () => clearTimeout(t);
  }, [game]);

  const tap = () => {
    if (shake.state === "needs-permission") void shake.request();
    roll();
  };

  if (duel && !result) {
    return (
      <button onClick={() => setDuel(null)} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-7xl">🔫</p>
        <p className="title-game text-4xl">¡RESULTADO DEL DUELO!</p>
        <p className="font-display text-2xl leading-snug whitespace-pre-line">{duel}</p>
        <p className="text-white/60">Toca para seguir</p>
      </button>
    );
  }

  if (result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-2xl text-white/80">{result.name} sacó</p>
        <Die key={result.key} value={result.value} className="dice-land w-56" />
        <p className="title-game text-7xl">{result.value}</p>
        {result.lost && (
          <p className={`btn-game px-5 py-2 text-2xl text-white ${result.value >= 5 ? "bg-btn-green" : "bg-btn-red"}`}>
            {result.value >= 5 ? "✨ ¡SE SALVÓ! NO BEBE" : "🍷 SIGUE PERDIDO: BEBE 1"}
          </p>
        )}
        {result.jailed && (
          <p className="btn-game bg-btn-red px-5 py-2 text-2xl text-white">🔓 BEBE {jailBail(result.value)} Y SALE DEL CALABOZO</p>
        )}
      </div>
    );
  }

  if (game.phase === "DECISION" && decision) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-3">
          <Marciano avatar={avatarOf(me)} expression={expressionFor(me, { isTurn: true })} size={56} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-white/70">Decide</p>
            <h2 className="truncate font-display text-3xl">{me.name}</h2>
          </div>
        </div>
        {decision}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-between gap-4 text-center">
      <div className="flex flex-col items-center gap-1">
        <Marciano avatar={avatarOf(me)} expression={expressionFor(me, { isTurn: true })} size={84} animated />
        <p className="font-display text-lg text-white/70">Le toca a</p>
        <h2 className="title-game max-w-full truncate text-5xl">{me.name.toUpperCase()}</h2>
      </div>

      <button
        onClick={tap}
        disabled={!canRoll}
        aria-label={`Tirar el dado por ${me.name}`}
        className="grid place-items-center rounded-[2.5rem] p-2 outline-none focus-visible:ring-4 focus-visible:ring-btn-yellow"
      >
        <Die value={busy ? face : (game.lastRoll ?? 6)} className={`w-60 ${busy ? "dice-tumble" : "dice-idle"}`} />
      </button>

      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-xl">
          {me.status.laberinto
            ? "Saca 5 o 6 para salir del laberinto"
            : me.status.carcel
              ? "🚔 Calabozo: con 1-3 bebes 2, con 4-6 bebes 4 para salir"
              : busy ? "Rodando…" : shake.state === "on" ? "📳 Agita el celular o toca el dado" : "👆 Toca el dado para tirar"}
        </p>
        {shake.state === "needs-permission" && (
          <button onClick={() => void shake.request()} className="btn-game bg-btn-blue px-4 py-2 text-white">
            📳 ACTIVAR AGITAR
          </button>
        )}
        <div className="flex items-center gap-2 rounded-full border-[3px] border-ink bg-ink/80 py-1 pl-1 pr-4">
          <Marciano avatar={avatarOf(next)} size={36} />
          <span className="font-display text-lg">
            Siguiente: <span className="text-btn-yellow">{next.name}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
