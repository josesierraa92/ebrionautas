"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import Board from "@/components/Board";
import DecisionPanel from "@/components/DecisionPanel";
import GameLog from "@/components/GameLog";
import PlayersList from "@/components/PlayersList";
import RuleBanner from "@/components/RuleBanner";
import TurnHeader from "@/components/TurnHeader";
import Winner from "@/components/Winner";
import { currentPlayer, type Action } from "@/game/engine";
import { api, playerKey, saved, sendAction, useRoom } from "@/lib/room-client";

type Creds = { playerId: string; secret: string };

/** El celular de cada jugador: unirse, tirar el dado y decidir en su turno. */
export default function JugadorPage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const { room, error, refresh } = useRoom(code);
  const [creds, setCreds] = useState<Creds | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setCreds(saved.get<Creds>(playerKey(code)));
    setLoaded(true);
  }, [code]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!loaded || !room) {
    return <Shell>{error ? <ErrorBox text={error} /> : <p>Conectando con la mesa {code}…</p>}</Shell>;
  }

  const member = creds && room.members.find((m) => m.id === creds.playerId);

  // 1. Unirse
  if (!member) {
    if (room.status !== "LOBBY") return <Shell><ErrorBox text="Esta partida ya empezó. Pide que creen otra mesa." /></Shell>;
    const join = () =>
      run(async () => {
        const c = await api<Creds>(`/api/rooms/${code}/join`, { name });
        saved.set(playerKey(code), c);
        setCreds(c);
      });
    return (
      <Shell>
        <p className="text-white/70">Mesa <b className="font-display text-btn-yellow">{code}</b></p>
        <h2 className="font-display text-3xl">¿Cómo te llamas, Ebrionauta?</h2>
        <input
          value={name}
          maxLength={16}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && !busy && join()}
          placeholder="Tu nombre"
          className="w-full rounded-xl border-[3px] border-ink bg-white px-3 py-3 text-xl text-ink outline-none"
        />
        <button disabled={!name.trim() || busy} onClick={join} className="btn-game w-full bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey">
          ¡SUBIR A BORDO!
        </button>
        <p className="text-xs text-white/50">Juego para mayores de 18 años. Bebe con moderación.</p>
        {actionError && <ErrorBox text={actionError} />}
      </Shell>
    );
  }

  // 2. Sala de espera
  if (room.status === "LOBBY" || !room.game) {
    const isFirst = room.members[0]?.id === member.id;
    return (
      <Shell>
        <Avatar color={member.color} />
        <h2 className="font-display text-3xl">¡Hola, {member.name}!</h2>
        <p className="text-white/70">Esperando a que despegue la nave…</p>
        <ul className="flex flex-wrap justify-center gap-2">
          {room.members.map((m) => (
            <li key={m.id} className="rounded-full border-[3px] border-ink px-3 py-1 font-display text-ink" style={{ background: m.color }}>
              {m.name}
            </li>
          ))}
        </ul>
        {isFirst && (
          <button
            disabled={room.members.length < 2 || busy}
            onClick={() => run(() => api(`/api/rooms/${code}/start`, { secret: creds!.secret }))}
            className="btn-game w-full bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey"
          >
            {room.members.length < 2 ? "ESPERANDO JUGADORES…" : "¡DESPEGAR!"}
          </button>
        )}
        {actionError && <ErrorBox text={actionError} />}
      </Shell>
    );
  }

  // 3. Partida
  const game = room.game;
  const turnOf = currentPlayer(game);
  const myTurn = turnOf.id === member.id && !game.winner;
  const winner = game.players.find((p) => p.id === game.winner);
  const act = (a: Action) => run(() => sendAction(code, creds!.secret, a));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="title-game text-2xl">EBRIONAUTAS</span>
        <span className="font-display text-white/70">Mesa {code}</span>
      </div>
      {game.rule && <RuleBanner text={game.rule.text} />}

      <div className={`rounded-2xl border-[3px] border-ink p-4 ${myTurn ? "bg-btn-green/25" : "bg-ink/80"}`}>
        {winner ? (
          <Winner winner={winner}>
            <Link href="/" className="btn-game bg-btn-green py-3 text-xl text-white">
              VOLVER AL INICIO
            </Link>
          </Winner>
        ) : (
          <div className="flex flex-col gap-3">
            <TurnHeader game={game} you={member.id} />
            {myTurn && game.phase === "ROLL" && (
              <button disabled={busy} onClick={() => act({ type: "ROLL" })} className="btn-game bg-btn-green py-6 text-3xl text-white disabled:bg-btn-grey">
                {turnOf.status.laberinto ? "TIRAR (5 o 6 para salir)" : "🎲 TIRAR"}
              </button>
            )}
            {myTurn && game.phase === "DECISION" && game.decision && (
              <DecisionPanel key={game.logSeq} decision={game.decision} me={turnOf} players={game.players} onAction={act} />
            )}
            {!myTurn && <p className="text-white/70">{game.log[0]?.text}</p>}
          </div>
        )}
        {actionError && <ErrorBox text={actionError} />}
      </div>

      <PlayersList game={game} highlight={member.id} onPenalty={(id) => act({ type: "PENALTY", id })} />
      <Board players={game.players} current={turnOf.id} />
      <GameLog log={game.log} max={15} />
      {error && <p className="text-sm text-btn-red">⚠️ {error}</p>}
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 py-10 text-center">{children}</main>;
}

function Avatar({ color }: { color: string }) {
  return (
    <span className="grid size-24 place-items-center rounded-full border-4 border-ink text-5xl" style={{ background: color }}>
      👽
    </span>
  );
}

function ErrorBox({ text }: { text: string }) {
  return <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white">{text}</p>;
}
