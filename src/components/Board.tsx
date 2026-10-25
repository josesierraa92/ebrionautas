import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { BOARD } from "@/game/board";
import type { Player } from "@/game/engine";
import { TILE_STYLE } from "@/game/tileStyle";

const COLS = 8;

/** Tablero en serpentina: fila 1 de izquierda a derecha, fila 2 al revés… */
export default function Board({ players, current }: { players: Player[]; current: string }) {
  const rows: (typeof BOARD)[] = [];
  for (let i = 0; i < BOARD.length; i += COLS) {
    const row = BOARD.slice(i, i + COLS);
    rows.push((i / COLS) % 2 === 0 ? row : [...row].reverse());
  }

  return (
    <div className="grid gap-1 rounded-2xl border-[3px] border-ink bg-ink/60 p-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
      {rows.map((row, r) => {
        const reversed = r % 2 === 1;
        return row.map((tile, c) => {
          const style = TILE_STYLE[tile.type];
          const here = players.filter((p) => p.pos === tile.n);
          const dark = ["MUERTE", "CARCEL", "LABERINTO", "REGLA", "CULTURAL", "SALIDA", "POSADA"].includes(tile.type);
          return (
            <div
              key={tile.n}
              title={`${tile.n}`}
              className="relative flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-ink"
              style={{
                background: style.bg,
                gridRow: r + 1,
                gridColumn: reversed && row.length < COLS ? c + 1 + (COLS - row.length) : c + 1,
              }}
            >
              <span className={`absolute top-0.5 left-1 font-display text-[10px] leading-none sm:text-xs ${dark ? "text-white" : "text-ink"}`}>
                {tile.n}
              </span>
              <span className={`text-base leading-none sm:text-2xl ${here.length ? "opacity-35" : ""}`} aria-hidden>
                {style.icon}
              </span>
              {here.length > 0 && (
                // Las fichas son los marcianos de colores; se encogen si comparten casilla.
                <div className="absolute inset-0 flex flex-wrap content-end items-end justify-center p-0.5">
                  {here.map((p) => (
                    <Marciano
                      key={p.id}
                      avatar={avatarOf(p)}
                      expression={expressionFor(p, { isTurn: p.id === current })}
                      title={p.name}
                      size={40}
                      className={`h-auto ${here.length <= 2 ? "w-[48%]" : here.length <= 4 ? "w-[42%]" : "w-[31%]"} ${p.id === current ? "animate-bounce" : ""}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        });
      })}
    </div>
  );
}
