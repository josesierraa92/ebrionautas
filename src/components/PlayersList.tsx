import BeerIcon from "@/components/BeerIcon";
import { characterOf } from "@/game/characters";
import Marciano from "@/components/Marciano";
import { Cups } from "@/components/Winner";
import { avatarOf, expressionFor } from "@/game/avatar";
import { LAST_TILE, trophiesOf, type GameState } from "@/game/engine";

type Props = {
  game: GameState;
  /** Tamaño TV: letras y fichas más grandes. */
  big?: boolean;
  /** Si se pasa, muestra el botón +1 para penalizar a quien rompa la ley vigente. */
  onPenalty?: (id: string) => void;
  /** Si se pasa, la deuda de cada jugador es un botón para marcarla como bebida. */
  onDrank?: (id: string) => void;
};

/** Marcador: casilla, vasos bebidos, deudas y estados de cada jugador. */
export default function PlayersList({ game, big = false, onPenalty, onDrank }: Props) {
  const current = game.players[game.turn]?.id;
  return (
    <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-3">
      <h3 className={`mb-2 font-display ${big ? "text-2xl" : "text-lg"}`}>Marcador</h3>
      {game.ronda && !game.winner && (
        <p className={`mb-2 rounded-xl bg-[#5fb21f]/25 px-2 py-1 ${big ? "text-base" : "text-xs"}`} title="Reto de ronda en marcha">
          ⏳ <b>Ronda de {game.players.find((q) => q.id === game.ronda!.by)?.name}:</b> {game.ronda.text}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {game.players.map((p) => (
          <li key={p.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${p.id === current && !game.winner ? "bg-white/10 ring-2 ring-btn-yellow" : ""}`}>
            <span className="relative shrink-0">
              <Marciano
                avatar={avatarOf(p)}
                expression={expressionFor(p, { winner: game.winner, isTurn: p.id === current })}
                size={big ? 48 : 34}
                character={characterOf(game.players, p.id)}
              />
              <Cups {...trophiesOf(game, p)} className={`absolute -top-1.5 -left-1.5 ${big ? "text-lg" : "text-sm"}`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate ${big ? "text-xl" : ""}`}>
                <span className="font-display">{p.name}</span>{" "}
                {p.gender && <span className={p.gender === "hombre" ? "text-btn-blue" : "text-btn-special"}>{p.gender === "hombre" ? "♂" : "♀"}</span>}{" "}
                {p.status.inmune && <span title="Estación Abstemia: inmune">⛽</span>}
                {p.status.hipnosis && <span title="Abducción mental">🌀</span>}
                {p.status.carcel && <span title="En el Purgatorio">🔥{p.status.carcel.debt ? <span className="font-display text-xs text-btn-red"> debe {p.status.carcel.debt}</span> : null}</span>}
                {game.slave?.slave === p.id && <span title="Pacto de Sangre: bebe lo mismo que su pactado">🩸<span className="text-xs text-btn-red"> ← {game.players.find((q) => q.id === game.slave!.master)?.name}</span></span>}
                {game.slave?.master === p.id && <span title="Pacto de Sangre: su pactado bebe lo mismo que él">🩸<span className="text-xs text-btn-red"> → {game.players.find((q) => q.id === game.slave!.slave)?.name}</span></span>}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full border border-ink bg-space" title={`Casilla ${p.pos} de ${LAST_TILE}`}>
                  <div className="h-full rounded-full" style={{ width: `${(p.pos / LAST_TILE) * 100}%`, background: p.color }} />
                </div>
                <span className={`shrink-0 font-display text-white/80 ${big ? "text-base" : "text-xs"}`}>
                  {p.pos}/{LAST_TILE}
                </span>
              </div>
            </div>
            {p.pending > 0 &&
              (onDrank ? (
                <button title="Marcar como bebido" onClick={() => onDrank(p.id)} className="btn-game animate-pulse bg-btn-red px-2 py-1 text-xs text-white">
                  DEBE {p.pending} ✓
                </button>
              ) : (
                <span className={`animate-pulse rounded-full border-2 border-ink bg-btn-red px-2 font-display ${big ? "text-base" : "text-xs"}`}>
                  DEBE {p.pending}
                </span>
              ))}
            <span className={`shrink-0 rounded-full border-2 border-ink bg-space px-2 font-display ${big ? "text-lg" : "text-sm"}`} title="Total bebido">
              <BeerIcon /> {p.drunk}
            </span>
            {onPenalty && game.rule && !game.winner && (
              <button
                title="Rompió la ley: bebe"
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
