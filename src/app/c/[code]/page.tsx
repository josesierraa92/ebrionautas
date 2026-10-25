"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import Board from "@/components/Board";
import DecisionPanel from "@/components/DecisionPanel";
import GameLog from "@/components/GameLog";
import PlayersList from "@/components/PlayersList";
import RuleBanner from "@/components/RuleBanner";
import Setup from "@/components/Setup";
import TurnHeader from "@/components/TurnHeader";
import Winner from "@/components/Winner";
import { currentPlayer, type Action, type Gender } from "@/game/engine";
import { api, controlKey, saved, sendAction, useRoom } from "@/lib/room-client";

/** El único celular que controla la mesa: agrega jugadores, tira el dado y decide. */
export default function ControlPage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const { room, error, refresh } = useRoom(code);
  const [secret, setSecret] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setSecret(saved.get<string>(controlKey(code)));
    setLoaded(true);
  }, [code]);

  // Si la TV liberó el control, la clave guardada ya no sirve.
  const released = room && !room.hasController && secret;
  useEffect(() => {
    if (!released) return;
    saved.set(controlKey(code), null);
    setSecret(null);
  }, [released, code]);

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

  // 1. Tomar el control
  if (!secret) {
    const claim = () =>
      run(async () => {
        const r = await api<{ secret: string }>(`/api/rooms/${code}/control`, {});
        saved.set(controlKey(code), r.secret);
        await refresh(); // que la mesa ya diga "con control" antes de usar la clave
        setSecret(r.secret);
      });
    return (
      <Shell>
        <p className="text-6xl">📱👽</p>
        <p className="text-white/70">
          Mesa <b className="font-display text-btn-yellow">{code}</b>
        </p>
        <h2 className="font-display text-3xl">¿Controlas tú el juego?</h2>
        <p className="text-white/70">Desde este celular se agregan los jugadores, se tira el dado y se decide todo. El tablero se ve en la TV.</p>
        {room.hasController ? (
          <ErrorBox text="Otro celular ya controla esta mesa. Pulsa 'Cambiar de celular' en la TV para liberarla." />
        ) : (
          <button disabled={busy} onClick={claim} className="btn-game w-full bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey">
            🎮 CONTROLAR LA MESA
          </button>
        )}
        {room.hasController && (
          <button onClick={() => refresh()} className="btn-game bg-btn-yellow px-4 py-2 text-white">
            VOLVER A INTENTAR
          </button>
        )}
        {actionError && <ErrorBox text={actionError} />}
      </Shell>
    );
  }

  // 2. Agregar la tripulación
  if (room.status === "LOBBY" || !room.game) {
    return (
      <>
        <Setup
          busy={busy}
          hint={`Mesa ${code} · el tablero se verá en la TV`}
          onStart={(players: { name: string; gender: Gender }[]) => run(() => api(`/api/rooms/${code}/start`, { secret, players }))}
        />
        {actionError && (
          <div className="mx-auto max-w-md px-4 pb-6">
            <ErrorBox text={actionError} />
          </div>
        )}
      </>
    );
  }

  // 3. Partida
  const game = room.game;
  const me = currentPlayer(game);
  const winner = game.players.find((p) => p.id === game.winner);
  const act = (a: Action) => run(() => sendAction(code, secret, a));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="title-game text-2xl">EBRIONAUTAS</span>
        <span className="font-display text-white/70">Mesa {code}</span>
      </div>
      {game.rule && <RuleBanner text={game.rule.text} />}

      <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
        {winner ? (
          <Winner winner={winner}>
            <button
              disabled={busy}
              onClick={() => run(() => api(`/api/rooms/${code}/reset`, { secret }))}
              className="btn-game bg-btn-green py-3 text-xl text-white"
            >
              OTRA PARTIDA
            </button>
            <Link href="/" className="btn-game bg-btn-yellow py-2 text-white">
              SALIR
            </Link>
          </Winner>
        ) : (
          <div className="flex flex-col gap-3">
            <TurnHeader game={game} />
            {game.phase === "ROLL" && (
              <button disabled={busy} onClick={() => act({ type: "ROLL" })} className="btn-game bg-btn-green py-6 text-3xl text-white disabled:bg-btn-grey">
                {me.status.laberinto ? "TIRAR (5 o 6 para salir)" : `🎲 TIRAR POR ${me.name.toUpperCase()}`}
              </button>
            )}
            {game.phase === "DECISION" && game.decision && (
              // fieldset deshabilitado: evita enviar la misma jugada dos veces mientras llega la respuesta
              <fieldset disabled={busy} className="contents">
                <DecisionPanel key={game.decisionSeq} decision={game.decision} me={me} players={game.players} onAction={act} />
              </fieldset>
            )}
          </div>
        )}
        {actionError && <ErrorBox text={actionError} />}
      </div>

      <PlayersList game={game} onPenalty={(id) => act({ type: "PENALTY", id })} onDrank={(id) => act({ type: "DRANK", id })} />
      <GameLog log={game.log} max={10} />
      <details className="rounded-2xl border-[3px] border-ink bg-ink/80 p-3">
        <summary className="cursor-pointer font-display">Ver tablero aquí</summary>
        <div className="mt-2">
          <Board players={game.players} current={me.id} />
        </div>
      </details>
      {error && <p className="text-sm text-btn-red">⚠️ {error}</p>}
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 py-10 text-center">{children}</main>;
}

function ErrorBox({ text }: { text: string }) {
  return <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white">{text}</p>;
}
