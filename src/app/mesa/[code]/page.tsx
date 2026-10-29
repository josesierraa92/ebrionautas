"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { use, useEffect, useState } from "react";
import BoardStage from "@/components/BoardStage";
import { Confetti } from "@/components/Fx";
import GameLog from "@/components/GameLog";
import PlayersList from "@/components/PlayersList";
import SoundToggle from "@/components/SoundToggle";
import TurnHeader from "@/components/TurnHeader";
import Clasificatoria from "@/components/Clasificatoria";
import { RuleCard, TurnChip, decisionText } from "@/components/TvCards";
import Winner from "@/components/Winner";
import { currentPlayer, type Decision } from "@/game/engine";
import { api, hostKey, saved, useRoom } from "@/lib/room-client";
import { useAutoUpdate } from "@/lib/useAutoUpdate";
import { useGameFx } from "@/lib/useGameFx";

/** Pantalla grande (TV / portátil): QR para el control, tablero y marcador. Solo muestra. */
export default function MesaPage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const { room, error, refresh } = useRoom(code);
  const [hostSecret, setHostSecret] = useState<string | null>(null);
  const [controlUrl, setControlUrl] = useState("");
  const fx = useGameFx(room?.game ?? null);
  // Se recarga sola cuando hay una versión nueva del juego (sin dado ni jugada en marcha).
  useAutoUpdate(fx.settled && !fx.dice && !fx.banner);
  // Panel del marcador a la derecha: se puede ocultar para ver solo el tablero (se recuerda en esta TV).
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    setHostSecret(saved.get<string>(hostKey(code)));
    setControlUrl(`${window.location.origin}/c/${code}`);
    setPanelOpen(saved.get<boolean>(PANEL_KEY) ?? true);

  }, [code]);

  const togglePanel = () => {
    saved.set(PANEL_KEY, !panelOpen);
    setPanelOpen(!panelOpen);
  };

  if (!room) return <Centered>{error ?? "Conectando con la mesa…"}</Centered>;

  const release = async () => {
    if (!confirm("¿Liberar el control para que otro celular lo tome?")) return;
    await api(`/api/rooms/${code}/control`, { hostSecret }, "DELETE").catch(() => {});
    await refresh();
  };

  if (room.status === "LOBBY" || !room.game) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center gap-6 px-4 py-8 text-center">
        <Link href="/" className="title-game text-5xl sm:text-6xl">
          MUERTOS DE SED
        </Link>
        {room.hasController ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-6xl">📱✅</p>
            <p className="font-display text-3xl">Celular conectado</p>
            <p className="text-lg text-white/80">Agregad a los jugadores desde el celular y pulsad ¡A LEVANTARSE!</p>
          </div>
        ) : (
          <>
            <p className="text-xl text-white/80">Escanea el QR con el celular que va a controlar el juego:</p>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
              {controlUrl && (
                <div className="rounded-2xl border-[3px] border-ink bg-white p-3">
                  <QRCodeSVG value={controlUrl} size={220} />
                </div>
              )}
              <div>
                <p className="text-sm text-white/70">o entra a la web y pon el código</p>
                <p className="title-game text-7xl tracking-widest">{code}</p>
              </div>
            </div>
          </>
        )}
        {room.hasController && hostSecret && (
          <button onClick={release} className="btn-game bg-btn-grey px-4 py-2 text-sm text-white">
            CAMBIAR DE CELULAR
          </button>
        )}
      </main>
    );
  }

  const game = room.game;
  const me = currentPlayer(game);
  const winner = game.players.find((p) => p.id === game.winner);

  // Tarjeta grande: explica la casilla donde cayó alguien (o lo que pasó al tirar) y se queda
  // hasta la siguiente tirada; si hay que decidir, enseña además qué marcar en el celular.
  const sameTile = fx.landed?.playerId === me.id && fx.landed.n === me.pos;
  const card = winner || !fx.settled || fx.banner
    ? null
    : game.decision
      ? { n: me.pos, playerId: me.id, key: sameTile ? fx.landed!.key : 100000 + game.decisionSeq }
      : fx.landed
        ? { n: fx.landed.n, playerId: fx.landed.playerId, key: fx.landed.key, result: fx.landed.result }
        : null;

  // el celular abrió la clasificatoria: sustituye al mensaje de ganador y tapa el tablero (fuera de BoardStage: ocupa toda la pantalla)
  const ranking = winner && game.ranking ? <Clasificatoria game={game} unit="min(1.7vw, 2.6vh)" /> : null;

  const overlays = (
    <>
      <TurnChip game={game} moving={!fx.settled || !!game.waiting} rolling={!!fx.dice?.rolling} />
      {card && <RuleCard game={game} n={card.n} playerId={card.playerId} cardKey={card.key} result={"result" in card ? card.result : undefined} />}
    </>
  );

  // Modo tablero a pantalla completa: sin barra ni marcador, solo unos botones pequeños flotando.
  if (!panelOpen) {
    return (
      <main className="fixed inset-0">
        <BoardStage players={game.players} current={me.id} winner={game.winner} fx={fx} bare className="h-full">
          {overlays}
          <div className="absolute top-[2%] right-[1.5%] z-50 flex items-center gap-2">
            <SoundToggle />
            <button onClick={toggleFullscreen} aria-label="Pantalla completa" title="Pantalla completa" className="icon-btn">
              ⛶
            </button>
            <button onClick={togglePanel} aria-label="Marcador" title="Marcador" className="icon-btn">
              ☰
            </button>
          </div>
        </BoardStage>
        {winner && !game.ranking && <Confetti />}
        {ranking}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start">
      <section className="flex flex-col gap-3 lg:flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="title-game text-3xl">MUERTOS DE SED</span>
          <span className="flex items-center gap-2 font-display text-white/70">
            <SoundToggle />
            <button onClick={toggleFullscreen} aria-label="Pantalla completa" title="Pantalla completa" className="icon-btn">
              ⛶
            </button>
            <button onClick={togglePanel} aria-label="Solo tablero" title="Solo tablero (oculta el marcador)" className="icon-btn">
              ⤢
            </button>
            <span className="ml-2">Mesa {code}</span>
            {hostSecret && (
              <button onClick={release} className="ml-2 text-xs text-white/40 underline">
                cambiar de celular
              </button>
            )}
          </span>
        </div>
        <BoardStage
          players={game.players}
          current={me.id}
          winner={game.winner}
          fx={fx}
          className={`aspect-[16/10] lg:aspect-auto lg:h-[calc(100dvh-5.5rem)]`}
        >
          {overlays}
        </BoardStage>
        {winner && !game.ranking && <Confetti />}
        {ranking}
      </section>
      <aside className="flex flex-col gap-4 lg:w-[28rem]">
        <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
          {winner ? (
            <Winner winner={winner} players={game.players} />
          ) : (
            <div className="flex flex-col gap-3">
              <TurnHeader game={game} />
              {game.decision ? (
                <DecisionInfo decision={game.decision} name={me.name} />
              ) : (
                <p className="font-display text-lg text-btn-yellow">🎲 {me.name}, tira el dado desde el celular</p>
              )}
            </div>
          )}
        </div>
        <PlayersList game={game} big />
        <GameLog log={game.log} max={12} />
        {error && <p className="text-sm text-btn-red">⚠️ {error}</p>}
      </aside>
    </main>
  );
}

const PANEL_KEY = "ebrionautas:panel";


function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

/** Qué se está decidiendo, en grande para que lo vea toda la mesa. */
function DecisionInfo({ decision, name }: { decision: Decision; name: string }) {
  const [title, text] = decisionText(decision, name);
  return (
    <div className="flex flex-col gap-1">
      <p className="font-display text-2xl text-btn-yellow">{title}</p>
      <p className="text-lg text-white/90">{text}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg">{children}</p>
      <Link href="/" className="btn-game bg-btn-yellow px-6 py-2 text-white">
        VOLVER
      </Link>
    </main>
  );
}
