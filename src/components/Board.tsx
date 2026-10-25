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
              <span className="text-base leading-none sm:text-2xl" aria-hidden>
                {style.icon}
              </span>
              {here.length > 0 && (
                <div className="absolute inset-x-0 bottom-0.5 flex flex-wrap justify-center gap-px">
                  {here.map((p) => (
                    <span
                      key={p.id}
                      title={p.name}
                      className={`grid size-3.5 place-items-center rounded-full border-2 border-ink font-display text-[7px] text-ink sm:size-5 sm:text-[10px] ${p.id === current ? "animate-bounce" : ""}`}
                      style={{ background: p.color }}
                    >
                      {p.name[0].toUpperCase()}
                    </span>
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
