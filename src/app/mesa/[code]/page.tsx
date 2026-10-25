"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { use, useEffect, useState } from "react";
import Board from "@/components/Board";
import GameLog from "@/components/GameLog";
import MemberChips from "@/components/MemberChips";
import PlayersList from "@/components/PlayersList";
import RuleBanner from "@/components/RuleBanner";
import TurnHeader from "@/components/TurnHeader";
import Winner from "@/components/Winner";
import { currentPlayer } from "@/game/engine";
import { api, hostKey, saved, useRoom } from "@/lib/room-client";

/** Pantalla grande (TV / portátil): tablero, QR para unirse y lo que pasa en cada turno. */
export default function MesaPage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const { room, error, refresh } = useRoom(code);
  const [hostSecret, setHostSecret] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState("");
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    setHostSecret(saved.get<string>(hostKey(code)));
    setJoinUrl(`${window.location.origin}/j/${code}`);
  }, [code]);

  if (!room) return <Centered>{error ?? "Conectando con la mesa…"}</Centered>;

  if (room.status === "LOBBY" || !room.game) {
    const start = async () => {
      try {
        setStartError(null);
        await api(`/api/rooms/${code}/start`, { secret: hostSecret });
        await refresh();
      } catch (e) {
        setStartError((e as Error).message);
      }
    };
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center gap-6 px-4 py-8 text-center">
        <Link href="/" className="title-game text-4xl sm:text-5xl">
          EBRIONAUTAS
        </Link>
        <p className="text-lg text-white/80">Escanead el QR con el celular o entrad a la web y poned el código:</p>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          {joinUrl && (
            <div className="rounded-2xl border-[3px] border-ink bg-white p-3">
              <QRCodeSVG value={joinUrl} size={200} />
            </div>
          )}
          <div>
            <p className="text-sm text-white/70">Código de la mesa</p>
            <p className="title-game text-7xl tracking-widest">{code}</p>
          </div>
        </div>

        <div className="w-full max-w-md rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
          <h2 className="mb-3 font-display text-xl">Ebrionautas a bordo ({room.members.length}/8)</h2>
          {room.members.length === 0 && <p className="text-white/60">Todavía nadie… 👽</p>}
          <MemberChips members={room.members} size={72} />
        </div>

        {hostSecret ? (
          <button
            disabled={room.members.length < 2}
            onClick={start}
            className="btn-game w-full max-w-md bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey"
          >
            {room.members.length < 2 ? "ESPERANDO JUGADORES…" : "¡DESPEGAR!"}
          </button>
        ) : (
          <p className="text-white/70">El primer jugador que se unió puede empezar la partida desde su celular.</p>
        )}
        {startError && <p className="text-btn-red">{startError}</p>}
      </main>
    );
  }

  const game = room.game;
  const me = currentPlayer(game);
  const winner = game.players.find((p) => p.id === game.winner);

  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start">
      <section className="flex flex-col gap-3 lg:flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="title-game text-2xl sm:text-3xl">EBRIONAUTAS</span>
          <span className="font-display text-white/70">Mesa {code}</span>
        </div>
        {game.rule && <RuleBanner text={game.rule.text} />}
        {/* El tablero es cuadrado: que quepa entero en el alto de la TV. */}
        <div className="mx-auto w-full" style={{ maxWidth: "calc(100dvh - 8rem)" }}>
          <Board players={game.players} current={me.id} />
        </div>
      </section>
      <aside className="flex flex-col gap-4 lg:w-96">
        <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
          {winner ? (
            <Winner winner={winner}>
              <Link href="/" className="btn-game bg-btn-green py-3 text-xl text-white">
                NUEVA MESA
              </Link>
            </Winner>
          ) : (
            <div className="flex flex-col gap-3">
              <TurnHeader game={game} />
              {game.decision?.kind === "SELECT_DRINKERS" && game.decision.mode === "vote" ? (
                <div className="flex flex-col gap-1">
                  <p className="font-display text-xl text-btn-yellow">🗳️ {game.decision.title}</p>
                  <p className="text-white/85">{game.decision.text}</p>
                  <p className="font-display">
                    📱 Responded en el celular: {Object.keys(game.decision.votes).length}/{game.players.length}
                  </p>
                </div>
              ) : (
                <p className="font-display text-btn-yellow">
                  {game.phase === "ROLL" ? `📱 ${me.name}, tira desde tu celular` : `📱 ${me.name} está decidiendo…`}
                </p>
              )}
            </div>
          )}
        </div>
        <PlayersList game={game} />
        <GameLog log={game.log} />
        {error && <p className="text-sm text-btn-red">⚠️ {error}</p>}
      </aside>
    </main>
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
