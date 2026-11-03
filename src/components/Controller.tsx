"use client";

// El control del juego: alta de jugadores y, en partida, el dado, las decisiones, «+ TRAGO», ajustes y marcador.
// Lo usan el celular que controla una mesa (`/c/[code]`) y el modo «un solo aparato» (`/mesa/[code]?solo=1`), donde la misma pantalla es la TV y el control.
import { useEffect, useState } from "react";
import Board from "@/components/Board";
import CardPanel, { CardText } from "@/components/CardPanel";
import FullscreenButton from "@/components/FullscreenButton";
import BeerIcon from "@/components/BeerIcon";
import DecisionPanel from "@/components/DecisionPanel";
import DiceController from "@/components/DiceController";
import GameLog from "@/components/GameLog";
import PlayersList from "@/components/PlayersList";
import Setup from "@/components/Setup";
import Clasificatoria from "@/components/Clasificatoria";
import SettingsDialog from "@/components/SettingsDialog";
import { Die } from "@/components/Fx";
import { cardContent } from "@/components/TvCards";
import type { Landed } from "@/lib/useGameFx";
import Winner from "@/components/Winner";
import { currentPlayer, matchOver, type Action, type Gender } from "@/game/engine";
import { api, sendAction } from "@/lib/room-client";
import type { PublicRoom } from "@/server/rooms";

type Props = {
  code: string;
  room: PublicRoom;
  /** Clave de control de este aparato. */
  secret: string;
  error: string | null;
  refresh: () => Promise<void>;
  /**
   * Modo «un solo aparato»: el tablero ocupa toda la pantalla (como en la TV) y el control va encima, flotando: botones arriba a la derecha,
   * el dado grande abajo, las decisiones en una ventana y el fin de partida en una barra. Se pone dentro del contenedor del tablero.
   */
  overlay?: boolean;
  /** (overlay) La TV todavía anima la jugada: el dado espera. */
  locked?: boolean;
  /** (overlay) La tarjeta de la casilla que acaba de pasar, para enseñarla junto a las decisiones. */
  card?: Landed | null;
  /** (overlay) Botones extra en la fila de arriba (el sonido). */
  extra?: React.ReactNode;
  /** (overlay) Celular vertical: el dado va abajo en el centro. */
  narrow?: boolean;
};

function GearIcon() {
  // tuerca sencilla, blanca, de 8 dientes y agujero en el medio
  return (
    <svg viewBox="0 0 24 24" width="1.25em" height="1.25em" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
      <path d="M19.39 10.23 L22.11 10.64 L22.11 13.36 L19.39 13.77 L18.48 15.97 L20.11 18.19 L18.19 20.11 L15.97 18.48 L13.77 19.39 L13.36 22.11 L10.64 22.11 L10.23 19.39 L8.03 18.48 L5.81 20.11 L3.89 18.19 L5.52 15.97 L4.61 13.77 L1.89 13.36 L1.89 10.64 L4.61 10.23 L5.52 8.03 L3.89 5.81 L5.81 3.89 L8.03 5.52 L10.23 4.61 L10.64 1.89 L13.36 1.89 L13.77 4.61 L15.97 5.52 L18.19 3.89 L20.11 5.81 L18.48 8.03Z" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  );
}

export default function Controller({ code, room, secret, error, refresh, overlay = false, locked = false, card = null, extra, narrow = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false); // ⚙️ ajustes: quitar vasos / sacar a un jugador
  const [addDrink, setAddDrink] = useState(false); // «+ Trago»: sumar un vaso a mano a cualquier jugador

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

  // PC: la barra espaciadora tira el dado (solo en el modo de pantalla completa y sin ventanas abiertas)
  const canRoll = overlay && !!room.game && room.game.phase === "ROLL" && !room.game.winner && !busy && !locked && !settings && !addDrink && !menu;
  useEffect(() => {
    if (!canRoll) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || (e.target as HTMLElement)?.closest?.("input, textarea, select")) return;
      e.preventDefault();
      run(() => sendAction(code, secret, { type: "ROLL" }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRoll, code, secret]);

  // Agregar a los muertos (jugadores)
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

  if (overlay) {
    const rollNow = () => run(() => sendAction(code, secret, { type: "ROLL" }));
    const dim = locked || busy;
    const nextRound = !matchOver(game);
    const onNext = () => run(() => api(`/api/rooms/${code}/reset`, { secret, same: true, ...(nextRound ? { next: true } : {}) }));
    const onExit = () => run(async () => { await api(`/api/rooms/${code}/reset`, { secret }); window.location.href = "/"; });
    const winnerButtons = winner && !game.ranking && (narrow ? (
      // celular vertical: clasificatoria arriba a todo el ancho; abajo, reiniciar a la izquierda y salir a la derecha
      <div className="absolute inset-x-0 bottom-[3%] z-50 flex flex-col gap-3 px-4">
        <button onClick={() => act({ type: "RANKING", on: true })} className="btn-game w-full bg-btn-special py-3 text-2xl text-white">
          CLASIFICATORIA
        </button>
        <div className="flex gap-3">
          <button disabled={busy} onClick={onNext} className="btn-game flex-1 bg-btn-green py-3 text-2xl text-white">
            {nextRound ? "SIGUIENTE RONDA" : "REINICIAR"}
          </button>
          <button disabled={busy} onClick={onExit} className="btn-game flex-1 bg-btn-grey py-3 text-2xl text-white">
            SALIR
          </button>
        </div>
      </div>
    ) : (
      <div className="absolute inset-x-0 bottom-[3%] z-50 flex flex-wrap items-center justify-center gap-3 px-3">
        <button onClick={() => act({ type: "RANKING", on: true })} className="btn-game bg-btn-special px-5 py-3 text-xl text-white">
          VER CLASIFICATORIA
        </button>
        <button disabled={busy} onClick={onNext} className="btn-game bg-btn-green px-5 py-3 text-xl text-white">
          {nextRound ? "SIGUIENTE RONDA ▶" : "REINICIAR (MISMOS JUGADORES)"}
        </button>
        <button disabled={busy} onClick={onExit} className="btn-game bg-btn-grey px-5 py-3 text-xl text-white">
          SALIR
        </button>
      </div>
    ));

    return (
      <>
        {narrow ? (
          <>
            {/* celular vertical: iconos grandes, + TRAGO y ajustes pegados a la esquina de arriba */}
            <div className="absolute top-2 right-2 z-50 flex items-center gap-1.5">
              {!winner && (
                <button onClick={() => setAddDrink(true)} className="btn-game relative grid h-12 w-12 place-items-center bg-btn-red text-white" aria-label="Agregar un trago a un jugador" title="+ Trago">
                  <BeerIcon size="1.9rem" />
                  {/* el + va dibujado (no es texto): el text-shadow del botón lo duplicaba y se veía doble */}
                  <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-white">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#14260a" strokeWidth="4.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 4v16M4 12h16" />
                    </svg>
                  </span>
                </button>
              )}
              <button onClick={() => setSettings(true)} className="btn-game grid h-12 w-12 place-items-center bg-btn-grey text-2xl text-white" aria-label="Ajustes de la partida" title="Ajustes">
                <GearIcon />
              </button>
              <FullscreenButton />
            </div>
            {/* el marcador, un icono junto al dado (con el juego ganado sube a la fila de arriba para no chocar con los botones del final) */}
            <button onClick={() => setMenu(true)} className={`btn-game absolute right-3 z-50 ${winner ? "top-[4.5rem]" : "bottom-[5%]"} grid h-12 w-12 place-items-center bg-btn-blue text-white`} aria-label="Marcador e historial" title="Marcador">
              <svg viewBox="0 0 24 24" width="1.6rem" height="1.6rem" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 20V11h5v9M9.5 20V4h5v16M15 20v-6h5v6M3 20h18" />
              </svg>
            </button>
          </>
        ) : (
        <div className="absolute top-[2%] right-[1.5%] z-50 flex items-center gap-2">
          {extra}
          {!winner && (
            <button onClick={() => setAddDrink(true)} className="btn-game whitespace-nowrap bg-btn-red px-2.5 text-base py-1 text-white" aria-label="Agregar un trago a un jugador">
              + TRAGO
            </button>
          )}
          <button onClick={() => setSettings(true)} className="btn-game flex items-center justify-center bg-btn-grey px-2.5 text-base py-1 text-white" aria-label="Ajustes de la partida" title="Ajustes">
            <GearIcon />
          </button>
          <FullscreenButton />
          <button onClick={() => setMenu(true)} className="btn-game whitespace-nowrap bg-btn-blue px-2.5 text-base py-1 text-white" aria-label="Marcador e historial">
            MARCADOR
          </button>
        </div>
        )}

        {/* el dado: abajo a la izquierda (en celular vertical, abajo en el centro), lejos de la tarjeta de la casilla */}
        {!winner && game.phase === "ROLL" && (
          <div className={`absolute bottom-[3%] z-50 ${narrow ? "left-1/2 -translate-x-1/2" : "left-[2%]"}`} style={{ width: "clamp(88px, 19vmin, 190px)" }}>
            <button
              onClick={rollNow}
              disabled={dim}
              aria-label="Tirar el dado"
              className={`flex w-full flex-col items-center gap-1 transition-opacity ${dim ? "opacity-50" : "dice-pulse"}`}
            >
              <Die value={game.lastRoll ?? 1} className="w-full drop-shadow-[0_6px_0_rgba(0,0,0,.35)]" />
              <span className="whitespace-nowrap rounded-full bg-black/60 px-3 py-0.5 font-display text-sm uppercase tracking-wide text-white">{dim ? "…" : narrow ? "Toca para tirar" : "Tirar · espacio"}</span>
            </button>
          </div>
        )}

        {winnerButtons}

        {/* decisión: la tarjeta y lo que hay que marcar, en una ventana */}
        {!winner && game.decision && !(overlay && locked) && (() => {
          // una sola tarjeta: la de la casilla, con lo que hay que decidir dentro (no una tarjeta dentro de otra)
          const c = card ? cardContent(game, card.n, card.playerId, card.result) : null;
          const body = (
            <CardPanel
              inline={!narrow}
              unit="17px"
              width={22}
              maxH="90dvh"
              z="z-50"
              label="Decisión"
              kicker={card ? `Casilla ${card.n}` : `Turno de ${me.name}`}
              title={c?.rule.title}
              icon={c?.icon ?? undefined}
              centerTitle={!c}
            >
              {c && <CardText size={1.05}>{c.rule.text}</CardText>}
              <div style={{ marginTop: c ? "0.9rem" : 0 }}>
                <fieldset disabled={busy} className="contents">
                  <DecisionPanel key={game.decisionSeq} decision={game.decision!} me={me} players={game.players.filter((p) => !p.paused)} onAction={act} compact />
                </fieldset>
              </div>
              {actionError && <ErrorBox text={actionError} />}
            </CardPanel>
          );
          // PC / celular horizontal: en la esquina de abajo a la derecha, donde sale siempre la tarjeta de la casilla (sin tapar el tablero ni oscurecerlo);
          // celular vertical: en una ventana centrada (no hay sitio en la esquina)
          return narrow ? body : <div className="absolute right-[1.5%] bottom-[3%] z-50">{body}</div>;
        })()}
        {actionError && !game.decision && (
          <div className="absolute inset-x-0 top-[10%] z-50 mx-auto w-fit max-w-[90%]">
            <ErrorBox text={actionError} />
          </div>
        )}
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
              <button onClick={() => setAddDrink(false)} className="btn-game w-full bg-btn-green py-3 text-2xl text-white">
                LISTO
              </button>
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
        {settings && <SettingsDialog game={game} busy={busy} onAction={act} onRestart={() => run(() => api(`/api/rooms/${code}/reset`, { secret, same: true }))} onClose={() => setSettings(false)} />}
        {menu && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#0a0620]">
            <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-4">
              <div className="flex w-full items-center justify-between gap-3">
                <span className="font-display uppercase" style={{ padding: "0.2rem 0.9rem", borderRadius: 999, background: "linear-gradient(160deg, #bffa58, #5fc34a)", color: "#14260a", fontSize: "1.15rem", letterSpacing: "0.08em" }}>
                  Mesa {code}
                </span>
                <button onClick={() => setMenu(false)} className="btn-game bg-btn-green px-7 py-3 text-3xl text-white">
                  CERRAR
                </button>
              </div>
              <PlayersList game={game} onPenalty={(id) => act({ type: "PENALTY", id })} />
              <GameLog log={game.log} max={10} />
              <button onClick={() => setMenu(false)} className="btn-game w-full bg-btn-green py-3 text-2xl text-white">
                CERRAR
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {!winner && (
            <button onClick={() => setAddDrink(true)} className="btn-game whitespace-nowrap bg-btn-red px-2.5 py-1 text-base text-white" aria-label="Agregar un trago a un jugador">
              + TRAGO
            </button>
          )}
          <button onClick={() => setSettings(true)} className="btn-game flex items-center justify-center bg-btn-grey px-2.5 py-1 text-base text-white" aria-label="Ajustes de la partida" title="Ajustes">
            <GearIcon />
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

      {settings && <SettingsDialog game={game} busy={busy} onAction={act} onRestart={() => run(() => api(`/api/rooms/${code}/reset`, { secret, same: true }))} onClose={() => setSettings(false)} />}

      {menu && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0620]">
          <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-4">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="font-display uppercase" style={{ padding: "0.2rem 0.9rem", borderRadius: 999, background: "linear-gradient(160deg, #bffa58, #5fc34a)", color: "#14260a", fontSize: "1.15rem", letterSpacing: "0.08em" }}>
                Mesa {code}
              </span>
              <button onClick={() => setMenu(false)} className="btn-game bg-btn-green px-7 py-3 text-3xl text-white">
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
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white">{text}</p>;
}
