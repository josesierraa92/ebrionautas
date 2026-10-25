"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Board from "@/components/Board";
import DecisionPanel from "@/components/DecisionPanel";
import Setup from "@/components/Setup";
import { TILE_NAMES, getTile } from "@/game/board";
import { applyAction, createGame, currentPlayer, type Action, type GameState } from "@/game/engine";

const STORAGE_KEY = "ebrionautas:partida";
const DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

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
  if (!game) return <Setup onStart={(players) => setGame(createGame(players))} />;

  const act = (a: Action) => setGame((g) => (g ? applyAction(g, a) : g));
  const me = currentPlayer(game);
  const tile = getTile(me.pos);
  const winner = game.players.find((p) => p.id === game.winner);
  const slaveOf = (id: string) => game.slave?.slave === id;

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
        {game.rule && (
          <div className="rounded-xl border-[3px] border-ink bg-btn-special/90 px-3 py-2 text-sm">
            ⚖️ <b>Ley vigente:</b> {game.rule.text}
          </div>
        )}
        <Board players={game.players} current={me.id} />
      </section>

      <aside className="flex flex-col gap-4 lg:w-96">
        <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
          {winner ? (
            <div className="flex flex-col gap-3 text-center">
              <div className="text-6xl">🏆🌍</div>
              <h2 className="title-game text-4xl">¡{winner.name.toUpperCase()} GANA!</h2>
              <p>Llegó a la Tierra. Que reparta el resto de bebida como quiera.</p>
              <button onClick={() => setGame(null)} className="btn-game bg-btn-green py-3 text-xl text-white">
                OTRA PARTIDA
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full border-[3px] border-ink text-2xl" style={{ background: me.color }}>
                  👽
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-white/70">Turno de</p>
                  <h2 className="truncate font-display text-2xl">{me.name}</h2>
                </div>
                {game.lastRoll && <span className="ml-auto text-5xl leading-none" aria-label={`Último dado: ${game.lastRoll}`}>{DICE[game.lastRoll]}</span>}
              </div>
              <p className="text-sm text-white/70">
                Casilla {me.pos}: {"title" in tile ? tile.title : TILE_NAMES[tile.type]}
              </p>

              {game.phase === "ROLL" && (
                <button onClick={() => act({ type: "ROLL" })} className="btn-game bg-btn-green py-5 text-3xl text-white">
                  {me.status.laberinto ? "TIRAR (5 o 6 para salir)" : "🎲 TIRAR"}
                </button>
              )}
              {game.phase === "DECISION" && game.decision && (
                <DecisionPanel key={game.logSeq} decision={game.decision} me={me} players={game.players} onAction={act} />
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-3">
          <h3 className="mb-2 font-display text-lg">Ebrionautas</h3>
          <ul className="flex flex-col gap-2">
            {game.players.map((p) => (
              <li key={p.id} className={`flex items-center gap-2 rounded-xl px-2 py-1 ${p.id === me.id ? "bg-white/10" : ""}`}>
                <span className="size-4 shrink-0 rounded-full border-2 border-ink" style={{ background: p.color }} />
                <span className="min-w-0 flex-1 truncate">
                  {p.name} <span className="text-xs text-white/60">· {p.pos}</span>{" "}
                  {p.status.inmune && <span title="Estación Abstemia: inmune">⛽</span>}
                  {p.status.hipnosis && <span title="Abducción mental">🌀</span>}
                  {p.status.laberinto && <span title="Perdido en el cinturón de asteroides">☄️</span>}
                  {p.status.carcel && <span title={`En el calabozo (fianza ${p.status.carcel.bail})`}>🚔</span>}
                  {slaveOf(p.id) && <span title="Esclavo">⛓️</span>}
                </span>
                <span className="rounded-full border-2 border-ink bg-space px-2 font-display text-sm">🍷 {p.drunk}</span>
                {game.rule && !winner && (
                  <button
                    title="Rompió la ley: bebe 1"
                    aria-label={`${p.name} rompió la ley`}
                    onClick={() => act({ type: "PENALTY", id: p.id })}
                    className="btn-game bg-btn-special px-2 text-xs text-white"
                  >
                    +1
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-3">
          <h3 className="mb-2 font-display text-lg">Bitácora de vuelo</h3>
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm text-white/85">
            {game.log.map((e) => (
              <li key={e.id}>{e.text}</li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}
