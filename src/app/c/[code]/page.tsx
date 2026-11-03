"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import Board from "@/components/Board";
import CardPanel, { CardText } from "@/components/CardPanel";
import FullscreenButton from "@/components/FullscreenButton";
import Logo from "@/components/Logo";
import DecisionPanel from "@/components/DecisionPanel";
import DiceController from "@/components/DiceController";
import GameLog from "@/components/GameLog";
import PlayersList from "@/components/PlayersList";
import Setup from "@/components/Setup";
import Clasificatoria from "@/components/Clasificatoria";
import SettingsDialog from "@/components/SettingsDialog";
import Winner from "@/components/Winner";
import { currentPlayer, matchOver, type Action, type Gender } from "@/game/engine";
import { api, controlKey, epochKey, saved, sendAction, useRoom } from "@/lib/room-client";

/** El único celular que controla la mesa: agrega jugadores, tira el dado y decide. */
export default function ControlPage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const { room, error, refresh } = useRoom(code);
  const [secret, setSecret] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false); // ⚙️ ajustes: quitar vasos / sacar a un jugador
  const [addDrink, setAddDrink] = useState(false); // «+ Trago»: sumar un vaso a mano a cualquier jugador

  useEffect(() => {
    setSecret(saved.get<string>(controlKey(code)));
    setLoaded(true);
  }, [code]);

  // Si la TV liberó el control, la clave guardada ya no sirve.
  // …o si otro celular lo tomó después (la «época» de la mesa ya no es la que guardamos al tomarlo): sin esto el celular viejo seguía enseñando el juego sin poder jugar.
  const lostEpoch = !!room && !!secret && (() => {
    const mine = saved.get<number>(epochKey(code));
    return mine !== null && room.controlEpoch !== mine;
  })();
  const released = room && secret && (!room.hasController || lostEpoch);
  // el celular que PERDIÓ el control no vuelve a pedirlo solo (si no, al soltarlo la TV le saldría otra vez «¿liberar?»): `asked` evita el aviso automático
  const asked = useRef(false);
  const autoClaim = useRef(false);
  useEffect(() => {
    if (!released) return;
    asked.current = true;
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

  const claimNow = () =>
    run(async () => {
      const r = await api<{ secret: string; epoch: number }>(`/api/rooms/${code}/control`, {});
      saved.set(controlKey(code), r.secret);
      saved.set(epochKey(code), r.epoch);
      await refresh(); // que la mesa ya diga "con control" antes de usar la clave
      setSecret(r.secret);
    });

  // Otro celular ya controla: se le avisa a la TV (le sale «¿Liberar el control?») y, cuando la libera, este celular entra solo.
  const blocked = loaded && !!room && !secret && room.hasController;
  useEffect(() => {
    if (!blocked || asked.current) return;
    asked.current = true;
    autoClaim.current = true; // y cuando la TV lo libere, entra solo
    api(`/api/rooms/${code}/request`, {}).catch(() => {});
  }, [blocked, code]);
  useEffect(() => {
    if (autoClaim.current && loaded && room && !secret && !room.hasController && !busy) claimNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.hasController, secret, loaded]);

  if (!loaded || !room) {
    return <Shell>{error ? <ErrorBox text={error} /> : <p>Conectando con la mesa {code}…</p>}</Shell>;
  }

  // 1. Tomar el control
  if (!secret) {
    return (
      <Shell>
        <Logo className="w-56" />
        <CardPanel
          inline
          unit="17px"
          width={22}
          kicker={`Mesa ${code}`}
          title="¿Controlas tú el juego?"
          icon="skull"
          actions={
            room.hasController ? (
              <button onClick={() => api(`/api/rooms/${code}/request`, {}).catch(() => {})} className="btn-game bg-btn-yellow px-4 py-3 text-xl text-white">
                PEDIR OTRA VEZ
              </button>
            ) : (
              <button disabled={busy} onClick={claimNow} className="btn-game w-full bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey">
                CONTROLAR LA MESA
              </button>
            )
          }
        >
          <CardText>Desde este celular se agregan los jugadores, se tira el dado y se decide todo. El tablero se ve en la TV.</CardText>
          {room.hasController && <div style={{ marginTop: 10 }}><ErrorBox text="Otro celular controla la mesa. Ya le avisamos a la TV: pulsa «LIBERAR» ahí y entras solo." /></div>}
          {actionError && <div style={{ marginTop: 10 }}><ErrorBox text={actionError} /></div>}
        </CardPanel>
      </Shell>
    );
  }

  // 2. Agregar a los muertos (jugadores)
  if (room.status === "LOBBY" || !room.game) {
    return (
      <>
        <Setup
          busy={busy}
          code={code}
          onStart={(players: { name: string; gender: Gender; look?: number }[], cups: number) => run(() => api(`/api/rooms/${code}/start`, { secret, players, cups }))}
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
        <div className="flex items-center gap-1.5">
          {!winner && (
            <button onClick={() => setAddDrink(true)} className="btn-game whitespace-nowrap bg-btn-red px-2.5 py-1 text-base text-white" aria-label="Agregar un trago a un jugador">
              + TRAGO
            </button>
          )}
          <button onClick={() => setSettings(true)} className="btn-game whitespace-nowrap bg-btn-grey px-2.5 py-1 text-base text-white" aria-label="Ajustes de la partida">
            AJUSTES
          </button>
        </div>
        <div className="flex items-center gap-2">
          <FullscreenButton />
          <button onClick={() => setMenu(true)} className="btn-game whitespace-nowrap bg-btn-blue px-2.5 py-1 text-base text-white" aria-label="Marcador e historial">
            MARCADOR
          </button>
        </div>
      </div>

      {winner && game.ranking ? null : winner ? (
        <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
          <Winner winner={winner} players={game.players} goal={game.cupsGoal ?? 1}>
            <div className="flex gap-2">
              <button onClick={() => act({ type: "RANKING", on: true })} className="btn-game flex-1 bg-btn-blue py-3 text-xl text-white">
                VER CLASIFICATORIA
              </button>
              <button onClick={() => setSettings(true)} className="btn-game bg-btn-grey px-4 py-3 text-xl text-white" aria-label="Ajustes de la partida">
                ⚙️
              </button>
            </div>
            {!matchOver(game) && (
              <button
                disabled={busy}
                onClick={() => run(() => api(`/api/rooms/${code}/reset`, { secret, same: true, next: true }))}
                className="btn-game bg-btn-green py-3 text-xl text-white"
              >
                SIGUIENTE RONDA ▶
              </button>
            )}
            {matchOver(game) && (
              <button
                disabled={busy}
                onClick={() => run(() => api(`/api/rooms/${code}/reset`, { secret, same: true }))}
                className="btn-game bg-btn-green py-3 text-xl text-white"
              >
                REINICIAR (MISMOS JUGADORES)
              </button>
            )}
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
                <DecisionPanel key={game.decisionSeq} decision={game.decision} me={me} players={game.players.filter((p) => !p.paused)} onAction={act} compact />
              </fieldset>
            )
          }
        />
      )}
      {actionError && <ErrorBox text={actionError} />}
      {error && <p className="text-sm text-btn-red">⚠️ {error}</p>}
      {winner && game.ranking && <Clasificatoria game={game} onClose={() => act({ type: "RANKING", on: false })} />}

      {addDrink && !winner && (
        <CardPanel
          kicker="Un trago más"
          title="+ Trago"
          centerTitle
          unit="17px"
          z="z-50"
          label="Agregar trago"
          onClose={() => setAddDrink(false)}
          actions={
            <>
              {actionError && <ErrorBox text={actionError} />}
              <button onClick={() => setAddDrink(false)} className="btn-game w-full bg-btn-green py-3 text-2xl text-white">
                LISTO
              </button>
            </>
          }
        >
          <CardText size={1}>Toca a quien debe beber (por ejemplo, si se equivocó con el apodo). No cambia el turno.</CardText>
          <ul className="flex flex-col" style={{ gap: "0.7rem", marginTop: "0.9rem" }}>
            {game.players.map((p) => (
              <li key={p.id}>
                <button disabled={busy} onClick={() => act({ type: "ADD_DRINK", id: p.id })} className="btn-game flex w-full items-center justify-between gap-2 bg-btn-red px-4 py-3 text-white disabled:opacity-60">
                  <span className="min-w-0 break-words text-left font-display uppercase leading-none" style={{ fontSize: p.name.length <= 8 ? "2rem" : p.name.length <= 12 ? "1.6rem" : "1.3rem" }}>{p.name}</span>
                  <span className="shrink-0 text-lg">+1 · lleva {p.drunk}</span>
                </button>
              </li>
            ))}
          </ul>
        </CardPanel>
      )}

      {settings && <SettingsDialog game={game} busy={busy} onAction={act} onClose={() => setSettings(false)} />}

      {menu && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0620]">
          <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-4">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="font-display uppercase" style={{ padding: "0.2rem 0.9rem", borderRadius: 999, background: "linear-gradient(160deg, #bffa58, #5fc34a)", color: "#14260a", fontSize: "1.15rem", letterSpacing: "0.08em" }}>
                Mesa {code}
              </span>
              <button onClick={() => setMenu(false)} className="btn-game bg-btn-green px-5 py-1 text-xl text-white">
                CERRAR
              </button>
            </div>
            <PlayersList game={game} onPenalty={(id) => act({ type: "PENALTY", id })} />
            <GameLog log={game.log} max={10} />
            <CardPanel inline kicker="Tablero" unit="17px" width={30} maxH="none">
              <Board players={game.players} current={me.id} />
            </CardPanel>
            <button onClick={() => setMenu(false)} className="btn-game w-full bg-btn-green py-3 text-2xl text-white">
              CERRAR
            </button>
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
