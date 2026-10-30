"use client";

import { characterOf } from "@/game/characters";
import { useEffect, useRef, useState } from "react";
import BeerIcon from "@/components/BeerIcon";
import { Die } from "@/components/Fx";
import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { currentPlayer, jailBail, type GameState } from "@/game/engine";
import { duelOutcome, jailOutcome, jailPaidOutcome, mazeOutcome } from "@/game/rules";
import { PhoneRuleCard } from "@/components/TvCards";
import { stepPath, type Landed } from "@/lib/useGameFx";
import { useShake } from "@/lib/useShake";

const RESULT_MS = 1300;

type Props = {
  game: GameState;
  busy: boolean;
  onRoll: () => void;
  /** «Siguiente turno»: avisa a la TV (cámara y cuadro de turno) de que ya se vio la tarjeta. */
  onNext?: () => void;
  /** Lo que se enseña cuando hay que decidir algo (tras mostrar el resultado del dado). */
  decision?: React.ReactNode;
};

/**
 * Pantalla del celular en la fase de tirar: un dado gigante que se tira agitando el
 * celular o tocándolo, de quién es el turno y a quién se le pasa después.
 */
export default function DiceController({ game, busy, onRoll, onNext, decision }: Props) {
  const me = currentPlayer(game);
  const [face, setFace] = useState(1);
  const [result, setResult] = useState<{ value: number; name: string; key: number; lost: boolean; jailed: boolean } | null>(null);
  const roller = useRef(me.name);
  const wasLost = useRef(false); // tiró estando perdido en el Panteón en Niebla
  const wasJailed = useRef(false); // tiró estando en el Purgatorio
  const rollerPos = useRef(me.pos);
  const seenRoll = useRef(game.rollSeq);
  const seenDuel = useRef(game.lastDuel?.seq);
  const seenJail = useRef(game.lastJail?.seq);
  // La misma tarjeta que la TV (casilla donde cayó o resultado de la tirada); se queda hasta la siguiente tirada.
  const [card, setCard] = useState<Landed | null>(() => {
    const last = game.players.find((p) => p.id === game.lastRoller);
    return last ? { key: 0, n: last.pos, playerId: last.id } : null;
  });

  // tarjeta ya cerrada con «Siguiente turno» (por su clave): hasta que salga otra, se ve el dado
  const [dismissed, setDismissed] = useState<number | null>(null);
  // Si hay que decidir algo, la tarjeta ya se ve en la misma pantalla que las opciones: al terminar no se repite.
  useEffect(() => {
    if (game.phase === "DECISION" && card) setDismissed(card.key);
  }, [game.phase, card]);
  // Una sola vez por jugada (y solo si la TV está esperando: si no, el motor rechazaría la acción).
  const nextSent = useRef(-1);
  const sendNext = () => {
    if (!game.waiting || nextSent.current === game.logSeq) return;
    nextSent.current = game.logSeq;
    onNext?.();
  };
  // Si la tarjeta ya se vio junto a la decisión no hay botón «Siguiente turno»: al resolverse la decisión se avisa a la TV sin
  // pedirlo (salvo que salga la tarjeta de resultado de un duelo, que sí lleva su botón).
  const prevPhase = useRef(game.phase);
  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = game.phase;
    if (was === "DECISION" && game.phase === "ROLL" && game.lastDuel?.seq === seenDuel.current && game.lastJail?.seq === seenJail.current) sendNext();
  }, [game.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  // el dado solo da vueltas si lo que se está enviando es una tirada (no el «Siguiente turno»)
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!busy) setRolling(false);
  }, [busy]);
  const spin = busy && rolling;
  const canRoll = game.phase === "ROLL" && !busy && !result && (!card || dismissed === card.key);
  const roll = () => {
    if (!canRoll) return;
    roller.current = me.name;
    rollerPos.current = me.pos;
    wasLost.current = me.status.laberinto;
    wasJailed.current = !!me.status.carcel;
    navigator.vibrate?.(80);
    setRolling(true);
    onRoll();
  };
  const shake = useShake(roll, canRoll);

  // Mientras se espera la respuesta, el dado da vueltas con caras al azar.
  useEffect(() => {
    if (!spin) return;
    const id = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 80);
    return () => clearInterval(id);
  }, [spin]);

  // Al llegar una tirada nueva, se enseña el resultado un momento antes de pasar el turno.
  useEffect(() => {
    if (game.rollSeq === seenRoll.current) return;
    seenRoll.current = game.rollSeq;
    if (!game.lastRoll) return;
    const r = game.lastRoll;
    // tirada de un duelo (la hizo el panel de decisión, no el dado de turno): solo se enseña el dado de quien tiró
    const duelRoll = game.decision?.kind === "DUEL_ROLL" || (!!game.lastDuel && game.lastDuel.seq !== seenDuel.current);
    if (duelRoll) {
      setResult({ value: r, name: game.players.find((p) => p.id === game.lastRoller)?.name ?? roller.current, key: game.rollSeq, lost: false, jailed: false });
      navigator.vibrate?.([40, 60, 40]);
      const t = setTimeout(() => setResult(null), RESULT_MS);
      return () => clearTimeout(t);
    }
    setResult({ value: r, name: roller.current, key: game.rollSeq, lost: wasLost.current, jailed: wasJailed.current });
    const by = game.lastRoller ?? "";
    const outcome = wasLost.current ? mazeOutcome(roller.current, r) : wasJailed.current ? jailOutcome(roller.current, r) : null;
    setCard(
      outcome
        ? { key: game.rollSeq, n: rollerPos.current, playerId: by, result: { good: "escaped" in outcome && outcome.escaped, tileIcon: true, title: outcome.title, text: outcome.text, drinks: "drinks" in outcome ? outcome.drinks : undefined } }
        : { key: game.rollSeq, n: stepPath(rollerPos.current, r).at(-1) ?? rollerPos.current, playerId: by },
    );
    wasLost.current = false;
    wasJailed.current = false;
    navigator.vibrate?.([40, 60, 40]);
    const t = setTimeout(() => setResult(null), RESULT_MS);
    return () => clearTimeout(t);
  }, [game.rollSeq, game.lastRoll, game.lastRoller]);

  // Duelo resuelto: la tarjeta pasa a decir quién sacó cuánto y quién bebe.
  useEffect(() => {
    if (game.lastDuel?.seq === seenDuel.current) return;
    seenDuel.current = game.lastDuel?.seq;
    const duel = duelOutcome(game);
    if (!duel || !game.lastDuel) return;
    const by = game.lastDuel.by;
    setCard({ key: -game.lastDuel.seq, n: game.players.find((p) => p.id === by)?.pos ?? 0, playerId: by, result: { good: false, tileIcon: true, ...duel } });
    navigator.vibrate?.([40, 60, 40]);
  }, [game]);

  // Pagó en el Purgatorio: la tarjeta dice si salió (pagó todo) o cuánto queda debiendo.
  useEffect(() => {
    if (game.lastJail?.seq === seenJail.current) return;
    seenJail.current = game.lastJail?.seq;
    const paid = jailPaidOutcome(game);
    if (!paid || !game.lastJail) return;
    const by = game.lastJail.by;
    setCard({ key: -1_000_000 - game.lastJail.seq, n: game.players.find((p) => p.id === by)?.pos ?? 0, playerId: by, result: { good: paid.free, tileIcon: true, title: paid.title, text: paid.text } });
    navigator.vibrate?.([40, 60, 40]);
  }, [game]);

  const tap = () => {
    if (shake.state === "needs-permission") void shake.request();
    roll();
  };

  if (result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-2xl text-white/80">{result.name} sacó</p>
        <Die key={result.key} value={result.value} className="dice-land w-56" />
        <p className="title-game text-7xl">{result.value}</p>
        {result.lost && (
          <p className={`btn-game px-5 py-2 text-2xl text-white ${result.value >= 5 ? "bg-btn-green" : "bg-btn-red"}`}>
            {result.value >= 5 ? "✨ ¡SE SALVÓ! NO BEBE" : <><BeerIcon /> SIGUE PERDIDO: BEBE</>}
          </p>
        )}
        {result.jailed && (
          <p className="btn-game bg-btn-red px-5 py-2 text-2xl text-white">🔥 DEBE {jailBail(result.value)} VASOS</p>
        )}
      </div>
    );
  }

  // Tras la tirada (y al llegar el turno): la tarjeta a pantalla completa y abajo «SIGUIENTE TURNO»; al tocarlo sale
  // «Le toca a …» con el dado en medio.
  if (game.phase === "ROLL" && card && dismissed !== card.key) {
    return (
      <div className="flex flex-1 flex-col justify-between gap-4">
        <div className="flex flex-1 flex-col justify-center gap-4">
          {/* de quién es la tarjeta (quien tiró) */}
          {(() => {
            const owner = game.players.find((p) => p.id === card.playerId) ?? me;
            return (
              <div className="flex items-center justify-center gap-3">
                <Marciano avatar={avatarOf(owner)} expression={expressionFor(owner, { isTurn: true })} size={64} animated character={characterOf(game.players, owner.id)} />
                <div className="min-w-0 text-left">
                  <p className="font-display text-base leading-none text-btn-special">Turno de</p>
                  <h2 className="title-game mt-1 max-w-full truncate text-4xl leading-none">{owner.name.toUpperCase()}</h2>
                </div>
              </div>
            );
          })()}
          <PhoneRuleCard game={game} n={card.n} playerId={card.playerId} cardKey={card.key} result={card.result} unit="19px" />
        </div>
        <button
          onClick={() => {
            setDismissed(card.key);
            sendNext();
          }}
          className="btn-game bg-btn-green py-4 text-2xl text-white"
        >
          SIGUIENTE TURNO ▶
        </button>
      </div>
    );
  }

  if (game.phase === "DECISION" && decision) {
    const tileNumber = card?.n ?? me.pos;
    const tilePlayerId = card?.playerId ?? me.id;
    // Pantalla completa: la tarjeta grande y centrada en el espacio que sobra, y las opciones abajo, al alcance del pulgar.
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <PhoneRuleCard
            game={game}
            n={tileNumber}
            playerId={tilePlayerId}
            cardKey={card?.key ?? (game.decisionSeq ?? tileNumber)}
            result={card?.result}
            unit="18px"
          />
        </div>
        <div className="pb-2">{decision}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-between gap-4 text-center">
      <div className="flex items-center gap-3">
        <Marciano avatar={avatarOf(me)} expression={expressionFor(me, { isTurn: true })} size={84} animated character={characterOf(game.players, me.id)} />
        <div className="min-w-0 text-left">
          <p className="font-display text-lg text-white/70">Le toca a</p>
          <h2 className="title-game max-w-full truncate text-5xl">{me.name.toUpperCase()}</h2>
        </div>
      </div>

      <button
        onClick={tap}
        disabled={!canRoll}
        aria-label={`Tirar el dado por ${me.name}`}
        className="grid place-items-center rounded-[2.5rem] p-2 outline-none focus-visible:ring-4 focus-visible:ring-btn-yellow"
      >
        <Die value={spin ? face : (game.lastRoll ?? 6)} className={`w-60 ${spin ? "dice-tumble" : "dice-idle"}`} />
      </button>

      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-xl">
          {me.status.laberinto
            ? "🌫️ Saca 5 o 6 para salir de la niebla"
            : me.status.carcel
              ? me.status.carcel.debt
                ? `🔥 Debes ${me.status.carcel.debt} ${me.status.carcel.debt === 1 ? "vaso" : "vasos"} del Purgatorio: toca el dado para pagar`
                : "🔥 Purgatorio: con 1-3 debes 2, con 4-6 debes 4 para salir"
              : spin ? "Rodando…" : shake.state === "on" ? "📳 Agita el celular o toca el dado" : "👆 Toca el dado para tirar"}
        </p>
        {shake.state === "needs-permission" && (
          <button onClick={() => void shake.request()} className="btn-game bg-btn-blue px-4 py-2 text-white">
            📳 ACTIVAR AGITAR
          </button>
        )}
      </div>
    </div>
  );
}
