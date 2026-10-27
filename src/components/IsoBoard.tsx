import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { BOARD, type Tile } from "@/game/board";
import type { Player } from "@/game/engine";
import { ISO_VIEW as VIEW, isoPos, isoSx as sx, isoSy as sy } from "@/game/isoPath";

// Tablero isométrico de la TV. La isla, las casillas, la decoración y la nave son una imagen
// renderizada en 3D de antemano (scripts/board3d, misma proyección); aquí solo se mueven
// encima las fichas y los números. No necesita WebGL, así que funciona en cualquier TV.

const TILE_T = 10; // alto del canto de las losas (en píxeles SVG)

type Props = {
  players: Player[];
  current: string;
  winner?: string | null;
  shown?: Record<string, number>;
  flying?: string | null;
  /** Ficha que sigue la cámara (siempre con zoom); null = tablero entero. */
  focus?: string | null;
};

const ZOOM = 1.8;

/** Transformación de cámara: acerca el tablero a `ZOOM` centrado en (x, y), sin salirse de la vista. */
function camera(x: number, y: number) {
  const halfW = VIEW.w / (2 * ZOOM);
  const halfH = VIEW.h / (2 * ZOOM);
  const fx = Math.min(Math.max(x, VIEW.x + halfW), VIEW.x + VIEW.w - halfW);
  const fy = Math.min(Math.max(y, VIEW.y + halfH), VIEW.y + VIEW.h - halfH);
  const tx = VIEW.x + VIEW.w / 2 - ZOOM * fx;
  const ty = VIEW.y + VIEW.h / 2 - ZOOM * fy;
  return `translate(${tx}px, ${ty}px) scale(${ZOOM})`;
}

export default function IsoBoard({ players, current, winner, shown, flying, focus }: Props) {
  const at = (p: Player) => shown?.[p.id] ?? p.pos;

  // Todo lo que va "de pie" se ordena por profundidad para que lo de delante tape a lo de atrás.
  const standing: { d: number; key: string; el: React.ReactNode }[] = [];
  for (const tile of BOARD) {
    if (tile.type === "META") continue;
    const { gx, gy } = isoPos(tile.n);
    standing.push({ d: gx + gy, key: `i${tile.n}`, el: <TileNumber tile={tile} /> });
  }

  const groups = new Map<number, Player[]>();
  for (const p of players) groups.set(at(p), [...(groups.get(at(p)) ?? []), p]);
  for (const p of players) {
    const pos = at(p);
    const { gx, gy } = isoPos(pos);
    const group = groups.get(pos)!;
    const i = group.indexOf(p);
    // Varias fichas en una casilla: en fila a lo ancho de la losa.
    const off = (i - (group.length - 1) / 2) * (group.length > 2 ? 0.24 : 0.32);
    const x = sx(gx + off, gy - off);
    const y = sy(gx + off, gy - off) - TILE_T + 4;
    const size = group.length > 3 ? 64 : 86;
    const isCurrent = p.id === current && !winner;
    const isFlying = p.id === flying;
    standing.push({
      d: gx + gy + 0.6 + i * 0.01,
      key: p.id,
      el: (
        <g
          style={{
            transform: `translate(${x}px, ${y}px)`,
            transition: isFlying ? "transform .45s cubic-bezier(.4,-.4,.5,1.4)" : "transform .12s ease-out",
          }}
        >
          <ellipse cx={0} cy={0} rx={size * 0.3} ry={size * 0.12} fill="#1d3b12" opacity=".3" />
          <g className={isFlying ? "token-fly" : undefined}>
            <svg x={-size / 2} y={-size * 1.12} width={size} height={size * 1.2} overflow="visible">
              <Marciano
                avatar={avatarOf(p)}
                expression={expressionFor(p, { winner, isTurn: isCurrent })}
                title={p.name}
                size={size}
                animated
                className={isCurrent ? "mc-hop" : "mc-bob"}
              />
            </svg>
          </g>
          {/* nombre encima de cada marciano */}
          <text x={0} y={-size * 1.18} textAnchor="middle" fontFamily="var(--font-lilita), sans-serif" fontSize={group.length > 3 ? 13 : 16} fill={isCurrent ? "#ffe066" : "#ffffff"} stroke="#1b1f4b" strokeWidth={5} paintOrder="stroke">
            {p.name}
          </text>
        </g>
      ),
    });
  }
  standing.sort((a, b) => a.d - b.d);

  const focused = players.find((p) => p.id === focus);
  const cam = focused ? isoPos(at(focused)) : null;

  return (
    <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className="h-full w-full" role="img" aria-label="Tablero">
      <g
        style={{
          transformBox: "view-box",
          transformOrigin: "0 0",
          transform: cam ? camera(sx(cam.gx, cam.gy), sy(cam.gx, cam.gy) - 50) : "none",
          transition: "transform .5s ease-in-out",
        }}
      >
        {/* isla, casillas, decoración y nave: render 3D hecho de antemano (scripts/board3d) */}
        <image href="/art/board.webp" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} />
        {standing.map((s) => (
          <g key={s.key}>{s.el}</g>
        ))}
      </g>
    </svg>
  );
}

/** Número de la casilla, de pie en el borde delantero de la losa. */
function TileNumber({ tile }: { tile: Tile }) {
  const { gx, gy } = isoPos(tile.n);
  const x = sx(gx, gy);
  const y = sy(gx, gy) - TILE_T;
  return (
    <text x={x} y={y + 21} textAnchor="middle" fontFamily="var(--font-lilita), sans-serif" fontSize={13} fill="#ffffff" stroke="#1b1f4b" strokeWidth={4} paintOrder="stroke">
      {tile.n}
    </text>
  );
}
