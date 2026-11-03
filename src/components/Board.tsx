import { characterOf } from "@/game/characters";
import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { BOARD, type Tile } from "@/game/board";
import type { Player } from "@/game/engine";
import { GRID, TILE_AREA, tileCenter } from "@/game/spiral";
import { TILE_STYLE, tileLabel } from "@/game/tileStyle";
import MaskIcon from "@/components/MaskIcon";
import { builtinIcon } from "@/editor/icons";
import { lookOf, newLayout, type BoardLayout } from "@/editor/layout";
import { usePublishedLayout } from "@/lib/usePublishedBoard";

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
const FALLBACK: BoardLayout = newLayout();

/** Tablero en espiral; las fichas son los personajes de colores. */
export default function Board({ players, current, winner, shown, flying, children }: Props) {
  // mismos colores e iconos que el tablero de la TV (los del editor); sin diseño publicado, los de serie
  const published = usePublishedLayout(true);
  const layout = published ?? FALLBACK;
  // Fichas agrupadas por casilla para repartirlas si comparten sitio.
  const at = (p: Player) => shown?.[p.id] ?? p.pos;
  const groups = new Map<number, Player[]>();
  for (const p of players) groups.set(at(p), [...(groups.get(at(p)) ?? []), p]);

  return (
    <div className="@container relative aspect-square w-full overflow-hidden rounded-2xl p-[1%]" style={{ background: "#160a35" }}>
      <div className="grid h-full w-full gap-[0.5%]" style={{ gridTemplate: `repeat(${GRID}, 1fr) / repeat(${GRID}, 1fr)` }}>
        {BOARD.map((tile) => (
          <TileView key={tile.n} tile={tile} layout={layout} />
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

function TileView({ tile, layout }: { tile: Tile; layout: BoardLayout }) {
  const area = TILE_AREA[tile.n];
  const look = lookOf(layout, tile.type);
  const grid = { gridRow: `${area.row + 1} / span ${area.rows}`, gridColumn: `${area.col + 1} / span ${area.cols}` };
  const name = builtinIcon(look.icon);
  const icon = (size: string) =>
    name ? (
      <MaskIcon name={name} color={ink} size={size} />
    ) : look.icon.startsWith("data:") ? (
      // imagen propia del editor
      // eslint-disable-next-line @next/next/no-img-element
      <img src={look.icon} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
    ) : (
      <span aria-hidden style={{ fontSize: size, lineHeight: 1 }}>{look.icon}</span>
    );
  // el color del número y del icono se lee siempre: oscuro sobre casillas claras y blanco sobre las oscuras (la pintura suave de la TV se pierde en el celular)
  const rgb = [1, 3, 5].map((i) => parseInt(look.color.slice(i, i + 2), 16));
  const ink = look.customInk ? look.ink : (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255 > 0.55 ? "#2b2140" : "#ffffff";
  const face = { background: `linear-gradient(165deg, ${look.color}, color-mix(in srgb, ${look.color} 72%, #000))`, color: ink };

  if (tile.type === "META") {
    return (
      <div className="@container relative flex flex-col items-center justify-center rounded-[6%]" style={{ ...grid, ...face }}>
        {icon("34cqw")}
        <span className="font-display uppercase leading-none" style={{ fontSize: "12cqw", marginTop: "3cqw" }}>
          Tu tumba
        </span>
        <span className="font-display" style={{ fontSize: "5.5cqw", opacity: 0.8 }}>
          62 · ¡La fiesta definitiva!
        </span>
      </div>
    );
  }

  const label = tileLabel(tile);
  return (
    <div className="@container relative flex flex-col items-center justify-center overflow-hidden rounded-[16%]" style={{ ...grid, ...face }} title={`${tile.n} · ${label}`}>
      <span className="absolute top-[6%] left-[9%] font-display leading-none" style={{ fontSize: "22cqw" }}>
        {tile.n}
      </span>
      <span style={{ marginTop: "8cqw" }}>{icon("46cqw")}</span>
      {label && (
        <span className="hidden w-full truncate px-[4%] text-center font-display leading-tight @[64px]:block" style={{ fontSize: "12.5cqw" }}>
          {label}
        </span>
      )}
    </div>
  );
}
