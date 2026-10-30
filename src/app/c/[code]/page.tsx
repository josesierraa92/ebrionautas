"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import Board from "@/components/Board";
import DecisionPanel from "@/components/DecisionPanel";
import DiceController from "@/components/DiceController";
import GameLog from "@/components/GameLog";
import PlayersList from "@/components/PlayersList";
import Setup from "@/components/Setup";
import Clasificatoria from "@/components/Clasificatoria";
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
  const [menu, setMenu] = useState(false);

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
        <p className="text-6xl">📱💀</p>
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

  // 2. Agregar a los muertos (jugadores)
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
        <span className="title-game text-xl">MUERTOS DE SED</span>
        <button onClick={() => setMenu(true)} className="btn-game bg-btn-blue px-3 py-1 text-white" aria-label="Marcador e historial">
          ☰ MARCADOR
        </button>
      </div>

      {winner && game.ranking ? null : winner ? (
        <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
          <Winner winner={winner} players={game.players}>
            <button onClick={() => act({ type: "RANKING", on: true })} className="btn-game bg-btn-blue py-3 text-xl text-white">
              VER CLASIFICATORIA
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => api(`/api/rooms/${code}/reset`, { secret, same: true }))}
              className="btn-game bg-btn-green py-3 text-xl text-white"
            >
              REINICIAR (MISMOS JUGADORES)
            </button>
            <button
              disabled={busy}
              onClick={() => run(async () => { await api(`/api/rooms/${code}/reset`, { secret }); window.location.href = "/"; })}
              className="btn-game bg-btn-yellow py-2 text-white"
            >
              SALIR
            </button>
          </Winner>
        </div>
      ) : (
        <DiceController
          game={game}
          busy={busy}
          onRoll={() => act({ type: "ROLL" })}
          onNext={() => act({ type: "NEXT_TURN" })}
          decision={
            game.decision && (
              // fieldset deshabilitado: evita enviar la misma jugada dos veces mientras llega la respuesta
              <fieldset disabled={busy} className="contents">
                <DecisionPanel key={game.decisionSeq} decision={game.decision} me={me} players={game.players} onAction={act} compact />
              </fieldset>
            )
          }
        />
      )}
      {actionError && <ErrorBox text={actionError} />}
      {error && <p className="text-sm text-btn-red">⚠️ {error}</p>}
      {winner && game.ranking && <Clasificatoria game={game} onClose={() => act({ type: "RANKING", on: false })} />}

      {menu && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-space/95">
          <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl">Mesa {code}</span>
              <button onClick={() => setMenu(false)} className="btn-game bg-btn-yellow px-4 py-1 text-white">
                ✕ CERRAR
              </button>
            </div>
            <PlayersList game={game} onPenalty={(id) => act({ type: "PENALTY", id })} onDrank={(id) => act({ type: "DRANK", id })} />
            <GameLog log={game.log} max={10} />
            <Board players={game.players} current={me.id} />
          </div>
        </div>
      )}
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 py-10 text-center">{children}</main>;
}

function ErrorBox({ text }: { text: string }) {
  return <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white">{text}</p>;
}
