"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Board from "@/components/Board";
import DecisionPanel from "@/components/DecisionPanel";
import GameLog from "@/components/GameLog";
import PlayersList from "@/components/PlayersList";
import RuleBanner from "@/components/RuleBanner";
import Setup from "@/components/Setup";
import TurnHeader from "@/components/TurnHeader";
import Winner from "@/components/Winner";
import { defaultAvatar } from "@/game/avatar";
import { applyAction, createGame, currentPlayer, type Action, type GameState } from "@/game/engine";
import { PLAYER_COLORS } from "@/game/tileStyle";

const STORAGE_KEY = "ebrionautas:partida";

/** Partida sin TV: el tablero y el control en la misma pantalla. */
export default function JugarPage() {
  const [game, setGame] = useState<GameState | null>(null);
  const [loaded, setLoaded] = useState(false);

  // La partida se guarda en el navegador para sobrevivir a una recarga.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setGame(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [game, loaded]);

  if (!loaded) return null;
  if (!game)
    return (
      <Setup
        hint="Sin TV: el tablero se ve en esta misma pantalla."
        onStart={(players) =>
          setGame(createGame(players.map((p, i) => ({ ...p, color: PLAYER_COLORS[i], avatar: defaultAvatar(i, PLAYER_COLORS[i]) }))))
        }
      />
    );

  const act = (a: Action) => setGame((g) => (g ? applyAction(g, a) : g));
  const me = currentPlayer(game);
  const winner = game.players.find((p) => p.id === game.winner);

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start">
      <section className="flex flex-col gap-3 lg:flex-1">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="title-game text-2xl sm:text-3xl">
            EBRIONAUTAS
          </Link>
          <button
            onClick={() => confirm("¿Terminar esta partida y empezar otra?") && setGame(null)}
            className="btn-game bg-btn-red px-3 py-1.5 text-sm text-white"
          >
            NUEVA PARTIDA
          </button>
        </div>
        {game.rule && <RuleBanner text={game.rule.text} />}
        <Board players={game.players} current={me.id} />
      </section>

      <aside className="flex flex-col gap-4 lg:w-96">
        <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
          {winner ? (
            <Winner winner={winner}>
              <button onClick={() => setGame(null)} className="btn-game bg-btn-green py-3 text-xl text-white">
                OTRA PARTIDA
              </button>
            </Winner>
          ) : (
            <div className="flex flex-col gap-3">
              <TurnHeader game={game} />
              {game.phase === "ROLL" && (
                <button onClick={() => act({ type: "ROLL" })} className="btn-game bg-btn-green py-5 text-3xl text-white">
                  {me.status.laberinto ? "TIRAR (5 o 6 para salir)" : "🎲 TIRAR"}
                </button>
              )}
              {game.phase === "DECISION" && game.decision && (
                <DecisionPanel key={game.decisionSeq} decision={game.decision} me={me} players={game.players} onAction={act} />
              )}
            </div>
          )}
        </div>
        <PlayersList game={game} onPenalty={(id) => act({ type: "PENALTY", id })} onDrank={(id) => act({ type: "DRANK", id })} />
        <GameLog log={game.log} />
      </aside>
    </main>
  );
}
