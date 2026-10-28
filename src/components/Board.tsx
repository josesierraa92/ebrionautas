import { characterOf } from "@/game/characters";
import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { BOARD, type Tile } from "@/game/board";
import type { Player } from "@/game/engine";
import { GRID, TILE_AREA, tileCenter } from "@/game/spiral";
import { TILE_STYLE, tileLabel } from "@/game/tileStyle";

type Props = {
  players: Player[];
  current: string;
  winner?: string | null;
  /** Posición mostrada de cada ficha (la animación va por detrás de la posición real). */
  shown?: Record<string, number>;
  /** Ficha que va volando (Oca, agujero negro…). */
  flying?: string | null;
  /** Capas encima del tablero: dado, títulos, confeti. */
  children?: React.ReactNode;
};

const TILE_PCT = 100 / GRID;

/** Tablero en espiral; las fichas son los personajes de colores. */
export default function Board({ players, current, winner, shown, flying, children }: Props) {
  // Fichas agrupadas por casilla para repartirlas si comparten sitio.
  const at = (p: Player) => shown?.[p.id] ?? p.pos;
  const groups = new Map<number, Player[]>();
  for (const p of players) groups.set(at(p), [...(groups.get(at(p)) ?? []), p]);

  return (
    <div className="board-space @container relative aspect-square w-full overflow-hidden rounded-3xl border-4 border-ink p-[1%] shadow-[0_8px_0_#1b1f4b]">
      <div className="grid h-full w-full gap-[0.5%]" style={{ gridTemplate: `repeat(${GRID}, 1fr) / repeat(${GRID}, 1fr)` }}>
        {BOARD.map((tile) => (
          <TileView key={tile.n} tile={tile} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-[1%]">
        {players.map((p) => {
          const pos = at(p);
          const group = groups.get(pos)!;
          const area = TILE_AREA[pos];
          const { x, y } = tileCenter(pos);
          // Varias fichas en la misma casilla se reparten en una cuadrícula; la tumba es más grande.
          const cols = area.cols > 1 ? Math.min(group.length, 4) : group.length <= 1 ? 1 : 2;
          const rows = Math.ceil(group.length / cols);
          const i = group.indexOf(p);
          const cellW = (TILE_PCT * area.cols) / Math.max(cols, area.cols > 1 ? 4 : 1);
          const cellH = (TILE_PCT * area.rows) / Math.max(rows, area.rows > 1 ? 3 : 1);
          const dx = ((i % cols) - (cols - 1) / 2) * cellW;
          const dy = (Math.floor(i / cols) - (rows - 1) / 2) * cellH * 0.85;
          const width = Math.min(TILE_PCT * 0.8, cellW * 0.95);
          const isCurrent = p.id === current && !winner;
          const isFlying = p.id === flying;
          return (
            <div
              key={p.id}
              className={`absolute ${isFlying ? "token-fly" : ""}`}
              style={{
                left: `${x + dx}%`,
                top: `${y + dy}%`,
                width: `${width}%`,
                translate: "-50% -58%",
                zIndex: isFlying ? 30 : isCurrent ? 20 : 10,
                transition: isFlying
                  ? "left .65s cubic-bezier(.4,-.3,.5,1.3), top .65s cubic-bezier(.4,-.3,.5,1.3), width .2s"
                  : "left .2s ease-out, top .2s ease-out, width .2s",
              }}
            >
              <Marciano
                avatar={avatarOf(p)}
                expression={expressionFor(p, { winner, isTurn: isCurrent })}
                title={p.name}
                size={64}
                animated
                character={characterOf(players, p.id)}
                className={`h-auto w-full drop-shadow-[0_3px_0_rgba(0,0,0,.45)] ${isCurrent ? "mc-hop" : "mc-bob"}`}
              />
            </div>
          );
        })}
      </div>

      {children}
    </div>
  );
}

function TileView({ tile }: { tile: Tile }) {
  const area = TILE_AREA[tile.n];
  const style = TILE_STYLE[tile.type];
  const grid = { gridRow: `${area.row + 1} / span ${area.rows}`, gridColumn: `${area.col + 1} / span ${area.cols}` };

  if (tile.type === "META") {
    return (
      <div className="earth-tile @container relative flex flex-col items-center justify-center rounded-2xl border-[3px] border-ink" style={grid}>
        <span className="earth-glow leading-none" style={{ fontSize: "30cqw" }} aria-hidden>
          🪦
        </span>
        <span className="title-game leading-none" style={{ fontSize: "11cqw" }}>
          TU TUMBA
        </span>
        <span className="font-display text-ink/80" style={{ fontSize: "5.5cqw" }}>
          62 · ¡La fiesta definitiva!
        </span>
      </div>
    );
  }

  const label = tileLabel(tile);
  return (
    <div
      className={`@container relative flex flex-col items-center justify-center overflow-hidden rounded-[14%] border-2 border-ink ${style.dark ? "text-white" : "text-ink"}`}
      style={{ ...grid, background: `linear-gradient(160deg, ${style.bg[0]}, ${style.bg[1]})` }}
      title={`${tile.n} · ${label}`}
    >
      <span className="absolute inset-x-[8%] top-[5%] h-[18%] rounded-full bg-white/30" aria-hidden />
      <span
        className="absolute top-[4%] left-[6%] grid aspect-square place-items-center rounded-full bg-ink font-display leading-none text-white"
        style={{ width: "30cqw", fontSize: "17cqw" }}
      >
        {tile.n}
      </span>
      <span className="leading-none drop-shadow-[0_2px_0_rgba(0,0,0,.25)]" style={{ fontSize: "44cqw", marginTop: "8cqw" }} aria-hidden>
        {style.icon}
      </span>
      {label && (
        <span className="hidden w-full truncate px-[4%] text-center font-display leading-tight @[64px]:block" style={{ fontSize: "12.5cqw" }}>
          {label}
        </span>
      )}
    </div>
  );
}
