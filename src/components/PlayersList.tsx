import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import type { GameState } from "@/game/engine";

type Props = {
  game: GameState;
  highlight?: string;
  /** Si se pasa, muestra el botón +1 para penalizar a quien rompa la ley vigente. */
  onPenalty?: (id: string) => void;
  /** Si se pasa, la deuda de cada jugador es un botón para marcarla como bebida (modo local). */
  onDrank?: (id: string) => void;
};

export default function PlayersList({ game, highlight, onPenalty, onDrank }: Props) {
  const current = game.players[game.turn]?.id;
  return (
    <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-3">
      <h3 className="mb-2 font-display text-lg">Ebrionautas</h3>
      <ul className="flex flex-col gap-2">
        {game.players.map((p) => (
          <li key={p.id} className={`flex items-center gap-2 rounded-xl px-2 py-1 ${p.id === current ? "bg-white/10" : ""}`}>
            <span className="relative shrink-0">
              <Marciano avatar={avatarOf(p)} expression={expressionFor(p, { winner: game.winner, isTurn: p.id === current })} size={30} />
              <span className="absolute -right-0.5 bottom-0 size-2.5 rounded-full border-2 border-ink" style={{ background: p.color }} title="Color de su ficha" />
            </span>
            <span className="min-w-0 flex-1 truncate">
              {p.name}
              {p.id === highlight && " (tú)"} <span className="text-xs text-white/60">· {p.pos}</span>{" "}
              {p.status.inmune && <span title="Estación Abstemia: inmune">⛽</span>}
              {p.status.hipnosis && <span title="Abducción mental">🌀</span>}
              {p.status.laberinto && <span title="Perdido en el cinturón de asteroides">☄️</span>}
              {p.status.carcel && <span title={`En el calabozo (fianza ${p.status.carcel.bail})`}>🚔</span>}
              {game.slave?.slave === p.id && <span title="Esclavo">⛓️</span>}
            </span>
            {p.pending > 0 &&
              (onDrank ? (
                <button
                  title="Marcar como bebido"
                  onClick={() => onDrank(p.id)}
                  className="btn-game animate-pulse bg-btn-red px-2 text-xs text-white"
                >
                  DEBE {p.pending} ✓
                </button>
              ) : (
                <span className="animate-pulse rounded-full border-2 border-ink bg-btn-red px-2 font-display text-xs">DEBE {p.pending}</span>
              ))}
            <span className="rounded-full border-2 border-ink bg-space px-2 font-display text-sm" title="Total bebido">
              🍷 {p.drunk}
            </span>
            {onPenalty && game.rule && !game.winner && (
              <button
                title="Rompió la ley: bebe 1"
                aria-label={`${p.name} rompió la ley`}
                onClick={() => onPenalty(p.id)}
                className="btn-game bg-btn-special px-2 text-xs text-white"
              >
                +1
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
