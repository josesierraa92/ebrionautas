"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { use, useEffect, useState } from "react";
import BoardStage from "@/components/BoardStage";
import { Confetti } from "@/components/Fx";
import GameLog from "@/components/GameLog";
import PlayersList from "@/components/PlayersList";
import RuleBanner from "@/components/RuleBanner";
import SoundToggle from "@/components/SoundToggle";
import TurnHeader from "@/components/TurnHeader";
import Winner from "@/components/Winner";
import { currentPlayer, type Decision } from "@/game/engine";
import { api, hostKey, saved, useRoom } from "@/lib/room-client";
import { useGameFx } from "@/lib/useGameFx";

/** Pantalla grande (TV / portátil): QR para el control, tablero y marcador. Solo muestra. */
export default function MesaPage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const { room, error, refresh } = useRoom(code);
  const [hostSecret, setHostSecret] = useState<string | null>(null);
  const [controlUrl, setControlUrl] = useState("");
  const fx = useGameFx(room?.game ?? null);

  useEffect(() => {
    setHostSecret(saved.get<string>(hostKey(code)));
    setControlUrl(`${window.location.origin}/c/${code}`);
  }, [code]);

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
          EBRIONAUTAS
        </Link>
        {room.hasController ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-6xl">📱✅</p>
            <p className="font-display text-3xl">Celular conectado</p>
            <p className="text-lg text-white/80">Agregad a la tripulación desde el celular y pulsad ¡DESPEGAR!</p>
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start">
      <section className="flex flex-col gap-3 lg:flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="title-game text-3xl">EBRIONAUTAS</span>
          <span className="flex items-center gap-3 font-display text-white/70">
            <SoundToggle />
            Mesa {code}
            {hostSecret && (
              <button onClick={release} className="ml-3 text-xs text-white/40 underline">
                cambiar de celular
              </button>
            )}
          </span>
        </div>
        {game.rule && <RuleBanner text={game.rule.text} />}
        <BoardStage
          players={game.players}
          current={me.id}
          winner={game.winner}
          fx={fx}
          className={`aspect-[16/10] lg:aspect-auto ${game.rule ? "lg:h-[calc(100dvh-9.5rem)]" : "lg:h-[calc(100dvh-5.5rem)]"}`}
        />
        {winner && <Confetti />}
      </section>
      <aside className="flex flex-col gap-4 lg:w-[28rem]">
        <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
          {winner ? (
            <Winner winner={winner} />
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

/** Qué se está decidiendo, en grande para que lo vea toda la mesa. */
function DecisionInfo({ decision, name }: { decision: Decision; name: string }) {
  const [title, text] = (() => {
    switch (decision.kind) {
      case "DISTRIBUTE":
        return ["⛽ Ronda de combustible", `${name} reparte ${decision.amount} ${decision.amount === 1 ? "vaso" : "vasos"}.`];
      case "DUEL":
        return ["🔫 Duelo de dados láser", `${name} elige hasta ${decision.amount} ${decision.amount === 1 ? "rival" : "rivales"}.`];
      case "SELECT_DRINKERS":
        return [decision.title, decision.text];
      case "PATINAZO":
        return ["🪐 ¡Resbalón en Saturno!", `${name}: beber ${decision.drinks} de golpe o volver a la ${decision.backTo}.`];
      case "RULE":
        return ["⚖️ Ley del Consejo Galáctico", `${name} dicta una nueva ley para todos.`];
      case "SLAVE":
        return ["⛓️ Esclavos", `${name} elige a su esclavo.`];
      case "CARCEL":
        return ["🚔 Calabozo Intergaláctico", `${name}: pagar fianza de ${decision.bail} vasos o esperar.`];
    }
  })();
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
