import { characterOf } from "@/game/characters";
import { TILE_NAMES, getTile } from "@/game/board";
import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { currentPlayer, type GameState } from "@/game/engine";

const DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

/** Quién juega, dónde está y el último dado. */
export default function TurnHeader({ game, you }: { game: GameState; you?: string }) {
  const me = currentPlayer(game);
  const tile = getTile(me.pos);
  return (
    <>
      <div className="flex items-center gap-3">
        <Marciano avatar={avatarOf(me)} expression={expressionFor(me, { isTurn: true })} size={56} className="shrink-0" character={characterOf(game.players, me.id)} />
        <div className="min-w-0">
          <p className="text-sm text-white/70">{me.id === you ? "¡Te toca!" : "Turno de"}</p>
          <h2 className="truncate font-display text-2xl">{me.name}</h2>
        </div>
        {game.lastRoll && (
          <span className="ml-auto text-5xl leading-none" aria-label={`Último dado: ${game.lastRoll}`}>
            {DICE[game.lastRoll]}
          </span>
        )}
      </div>
      <p className="text-sm text-white/70">
        Casilla {me.pos}: {"title" in tile ? tile.title : TILE_NAMES[tile.type]}
      </p>
    </>
  );
}
