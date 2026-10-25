import Marciano from "@/components/Marciano";
import { BlackHoleIcon, DiceIcon, GooseIcon, INK, RocketIcon, SaturnIcon, SirenIcon, WineIcon } from "@/components/GameIcons";
import { avatarOf, expressionFor } from "@/game/avatar";
import { BOARD, type Tile } from "@/game/board";
import type { Player } from "@/game/engine";
import { ISO_COLS, ISO_ROWS, isoPos } from "@/game/isoPath";
import { TILE_STYLE } from "@/game/tileStyle";

// Tablero isométrico ("2.5D") en horizontal: bloques con cara superior clara y
// laterales oscuros sobre una isla flotando en el espacio.

const TW = 100; // ancho de una celda en pantalla
const TH = 50; // alto de una celda (isométrico 2:1)
const TILE_H = 12; // grosor de las casillas
const ISLAND_H = 40; // grosor de la isla

const sx = (gx: number, gy: number) => ((gx - gy) * TW) / 2;
const sy = (gx: number, gy: number) => ((gx + gy) * TH) / 2;

// Extensión de la isla (un poco más grande que el recorrido) y caja de la vista.
const I0 = -0.9;
const IX = ISO_COLS - 0.1;
const IY = ISO_ROWS - 0.1;
const VIEW = {
  x: sx(I0, IY) - 40,
  y: sy(I0, I0) - 170,
  w: sx(IX, I0) - sx(I0, IY) + 80,
  h: sy(IX, IY) - sy(I0, I0) + ISLAND_H + 220,
};

const ICONS: Partial<Record<Tile["type"], (p: { className?: string }) => React.ReactNode>> = {
  SALIDA: RocketIcon,
  A_BEBER: WineIcon,
  DUELO: DiceIcon,
  OCA: GooseIcon,
  CARCEL: SirenIcon,
  MUERTE: BlackHoleIcon,
  PATINAZO: SaturnIcon,
};

type Props = { players: Player[]; current: string; winner?: string | null; shown?: Record<string, number> };

export default function IsoBoard({ players, current, winner, shown }: Props) {
  const at = (p: Player) => shown?.[p.id] ?? p.pos;
  const tiles = [...BOARD].sort((a, b) => depth(a.n) - depth(b.n));

  // Lo que va "de pie" (íconos, decoración, fichas) se ordena por profundidad para taparse bien.
  const standing: { d: number; el: React.ReactNode }[] = [];
  for (const tile of BOARD) {
    if (tile.type === "META") continue;
    const { gx, gy } = isoPos(tile.n);
    standing.push({ d: gx + gy, el: <TileIcon key={`i${tile.n}`} tile={tile} /> });
  }
  for (const deco of DECOR) standing.push({ d: deco.gx + deco.gy, el: <Decoration key={`d${deco.gx},${deco.gy}`} {...deco} /> });
  const groups = new Map<number, Player[]>();
  for (const p of players) groups.set(at(p), [...(groups.get(at(p)) ?? []), p]);
  for (const p of players) {
    const pos = at(p);
    const { gx, gy } = isoPos(pos);
    const group = groups.get(pos)!;
    const i = group.indexOf(p);
    // Varias fichas en una casilla: en fila a lo largo de la casilla.
    const off = (i - (group.length - 1) / 2) * (group.length > 2 ? 0.28 : 0.38);
    const x = sx(gx + off, gy - off);
    const y = sy(gx + off, gy - off) - TILE_H;
    const size = group.length > 3 ? 34 : 44;
    standing.push({
      d: gx + gy + 0.5 + i * 0.01,
      el: (
        <g key={p.id}>
          <ellipse cx={x} cy={y} rx={size * 0.32} ry={size * 0.12} fill="#000" opacity=".25" />
          <svg x={x - size / 2} y={y - size * 1.12} width={size} height={size * 1.2} overflow="visible">
            <Marciano avatar={avatarOf(p)} expression={expressionFor(p, { winner, isTurn: p.id === current })} size={size} animated className={p.id === current && !winner ? "mc-hop" : "mc-bob"} />
          </svg>
        </g>
      ),
    });
  }
  standing.sort((a, b) => a.d - b.d);

  return (
    <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className="h-full w-full" role="img" aria-label="Tablero">
      <Island />
      {tiles.map((t) => (t.type === "META" ? <EarthTile key={t.n} n={t.n} /> : <TileBlock key={t.n} tile={t} />))}
      {standing.map((s) => s.el)}
    </svg>
  );
}

function depth(n: number) {
  const { gx, gy } = isoPos(n);
  return gx + gy;
}

/** Rombo de una celda (o de un área) a cierta altura. */
function diamond(gx0: number, gy0: number, gx1: number, gy1: number, lift = 0) {
  return [
    [sx(gx0, gy0), sy(gx0, gy0) - lift],
    [sx(gx1, gy0), sy(gx1, gy0) - lift],
    [sx(gx1, gy1), sy(gx1, gy1) - lift],
    [sx(gx0, gy1), sy(gx0, gy1) - lift],
  ] as const;
}
const pts = (p: readonly (readonly number[])[]) => p.map((q) => q.join(",")).join(" ");

/** Bloque isométrico: cara de arriba y las dos laterales visibles. */
function Block({ gx0, gy0, gx1, gy1, h, top, left, right, stroke = 4 }: { gx0: number; gy0: number; gx1: number; gy1: number; h: number; top: string; left: string; right: string; stroke?: number }) {
  const t = diamond(gx0, gy0, gx1, gy1, h);
  const g = diamond(gx0, gy0, gx1, gy1, 0);
  // t: [atrás, derecha, delante, izquierda]
  return (
    <g stroke={INK} strokeWidth={stroke} strokeLinejoin="round">
      <polygon points={pts([t[3], t[2], g[2], g[3]])} fill={left} />
      <polygon points={pts([t[2], t[1], g[1], g[2]])} fill={right} />
      <polygon points={pts(t)} fill={top} />
    </g>
  );
}

function Island() {
  return (
    <g>
      <ellipse cx={sx((I0 + IX) / 2, (I0 + IY) / 2)} cy={sy(IX, IY) + ISLAND_H + 60} rx={VIEW.w * 0.42} ry={40} fill="#000" opacity=".25" />
      <Block gx0={I0} gy0={I0} gx1={IX} gy1={IY} h={ISLAND_H} top="#7ed957" left="#c57a3a" right="#9a5524" stroke={6} />
      {/* franja de césped más clara sobre el borde */}
      <polygon points={pts(diamond(I0 + 0.15, I0 + 0.15, IX - 0.15, IY - 0.15, ISLAND_H))} fill="none" stroke="#a6ec7a" strokeWidth={6} opacity=".7" />
    </g>
  );
}

function TileBlock({ tile }: { tile: Tile }) {
  const { gx, gy } = isoPos(tile.n);
  const s = TILE_STYLE[tile.type];
  const pad = 0.08;
  const [g0x, g0y, g1x, g1y] = [gx - 0.5 + pad, gy - 0.5 + pad, gx + 0.5 - pad, gy + 0.5 - pad];
  const cx = sx(gx, gy);
  const cy = sy(gx, gy) - ISLAND_H - TILE_H;
  return (
    <g transform={`translate(0 ${-ISLAND_H})`}>
      <Block gx0={g0x} gy0={g0y} gx1={g1x} gy1={g1y} h={TILE_H} top={s.bg[0]} left={s.bg[1]} right={shade(s.bg[1], -0.25)} />
      {/* número pintado sobre la casilla, en el plano del suelo */}
      <text
        transform={`matrix(0.5 0.25 -0.5 0.25 ${cx} ${cy + ISLAND_H})`}
        x={-26}
        y={-12}
        fontFamily="var(--font-lilita), sans-serif"
        fontSize={30}
        fill={s.dark ? "#fff" : INK}
        opacity=".85"
      >
        {tile.n}
      </text>
    </g>
  );
}

function TileIcon({ tile }: { tile: Tile }) {
  const { gx, gy } = isoPos(tile.n);
  const x = sx(gx, gy);
  const y = sy(gx, gy) - ISLAND_H - TILE_H;
  const Icon = ICONS[tile.type];
  const size = 46;
  return (
    <g>
      <ellipse cx={x} cy={y + 2} rx={16} ry={6} fill="#000" opacity=".18" />
      {Icon ? (
        <svg x={x - size / 2} y={y - size + 6} width={size} height={size} overflow="visible">
          <Icon />
        </svg>
      ) : (
        <text x={x} y={y + 4} textAnchor="middle" fontSize={34}>
          {TILE_STYLE[tile.type].icon}
        </text>
      )}
    </g>
  );
}

function EarthTile({ n }: { n: number }) {
  const { gx, gy } = isoPos(n);
  const x = sx(gx, gy);
  const y = sy(gx, gy) - ISLAND_H - 26;
  return (
    <g>
      <g transform={`translate(0 ${-ISLAND_H})`}>
        <Block gx0={gx - 0.62} gy0={gy - 0.62} gx1={gx + 0.62} gy1={gy + 0.62} h={26} top="#ffe066" left="#ff9f1c" right="#e26a00" />
      </g>
      <circle cx={x} cy={y - 52} r={60} fill="#ffe066" opacity=".25" />
      <defs>
        <radialGradient id="earth-sea" cx="0.35" cy="0.3">
          <stop offset="0" stopColor="#bfeaff" />
          <stop offset="0.6" stopColor="#2f7bf5" />
          <stop offset="1" stopColor="#1f4bd6" />
        </radialGradient>
      </defs>
      <g stroke={INK} strokeWidth={4} strokeLinejoin="round">
        <circle cx={x} cy={y - 50} r={38} fill="url(#earth-sea)" />
        <path d={`M${x - 26} ${y - 66} q10 -8 20 0 q6 10 -4 16 q-10 4 -12 14 q-8 -6 -10 -14 q-2 -10 6 -16 z`} fill="#5cd23c" strokeWidth={3} />
        <path d={`M${x + 6} ${y - 40} q12 -6 22 2 q2 12 -8 18 q-10 2 -14 -6 q-4 -8 0 -14 z`} fill="#5cd23c" strokeWidth={3} />
        <path d={`M${x - 24} ${y - 72} q14 -12 30 -10`} fill="none" stroke="#fff" strokeWidth={5} opacity=".7" />
      </g>
      <text x={x} y={y - 100} textAnchor="middle" fontFamily="var(--font-lilita), sans-serif" fontSize={26} fill="#ffe066" stroke={INK} strokeWidth={7} paintOrder="stroke">
        62 · LA TIERRA
      </text>
    </g>
  );
}

// Decoración sobre el césped (filas entre los caminos).
type Deco = { gx: number; gy: number; kind: "tree" | "pine" | "rock" | "ufo" | "lake" | "flag" };
const DECOR: Deco[] = [
  { gx: 2, gy: 5, kind: "tree" },
  { gx: 6, gy: 5, kind: "pine" },
  { gx: 11, gy: 5, kind: "tree" },
  { gx: 3, gy: 3, kind: "rock" },
  { gx: 7, gy: 3, kind: "lake" },
  { gx: 12, gy: 3, kind: "pine" },
  { gx: 4, gy: 1, kind: "tree" },
  { gx: 9, gy: 1, kind: "ufo" },
  { gx: 13, gy: 1, kind: "tree" },
  { gx: -0.2, gy: 7.2, kind: "flag" },
];

function Decoration({ gx, gy, kind }: Deco) {
  const x = sx(gx, gy);
  const y = sy(gx, gy) - ISLAND_H;
  switch (kind) {
    case "tree":
      return (
        <g stroke={INK} strokeWidth={4} strokeLinejoin="round">
          <ellipse cx={x} cy={y} rx={18} ry={7} fill="#000" opacity=".2" stroke="none" />
          <rect x={x - 5} y={y - 30} width={10} height={30} rx={3} fill="#9a5524" />
          <path d={`M${x} ${y - 100} C${x + 34} ${y - 96} ${x + 34} ${y - 30} ${x} ${y - 28} C${x - 34} ${y - 30} ${x - 34} ${y - 96} ${x} ${y - 100} Z`} fill="#b8f35a" />
          <path d={`M${x} ${y - 64} C${x + 30} ${y - 62} ${x + 30} ${y - 30} ${x} ${y - 28} C${x - 30} ${y - 30} ${x - 30} ${y - 62} ${x} ${y - 64} Z`} fill="#5cd23c" stroke="none" opacity=".8" />
          <path d={`M${x - 12} ${y - 84} q6 -8 14 -8`} fill="none" stroke="#fff" strokeWidth={5} opacity=".7" />
        </g>
      );
    case "pine":
      return (
        <g stroke={INK} strokeWidth={4} strokeLinejoin="round">
          <ellipse cx={x} cy={y} rx={16} ry={6} fill="#000" opacity=".2" stroke="none" />
          <rect x={x - 4} y={y - 22} width={8} height={22} fill="#9a5524" />
          <path d={`M${x} ${y - 96} L${x + 24} ${y - 24} L${x - 24} ${y - 24} Z`} fill="#9b5de5" />
          <path d={`M${x} ${y - 96} L${x + 24} ${y - 24} L${x} ${y - 24} Z`} fill="#7a3fd0" stroke="none" />
          <circle cx={x - 6} cy={y - 60} r={4} fill="#ffe066" stroke="none" />
          <circle cx={x + 8} cy={y - 40} r={4} fill="#00d1c1" stroke="none" />
        </g>
      );
    case "rock":
      return (
        <g stroke={INK} strokeWidth={4} strokeLinejoin="round">
          <path d={`M${x - 26} ${y} q-4 -22 16 -30 q20 -10 34 6 q12 14 0 24 z`} fill="#b9c2d8" />
          <path d={`M${x - 26} ${y} q20 6 50 0`} fill="none" />
          <ellipse cx={x + 4} cy={y - 16} rx={7} ry={4} fill="#8a99b0" strokeWidth={3} />
        </g>
      );
    case "lake":
      return (
        <g stroke={INK} strokeWidth={4}>
          <ellipse cx={x} cy={y} rx={44} ry={16} fill="#c8143c" transform={`rotate(26.5 ${x} ${y})`} />
          <ellipse cx={x - 6} cy={y - 3} rx={30} ry={9} fill="#ff5c7a" stroke="none" opacity=".6" transform={`rotate(26.5 ${x} ${y})`} />
          <text x={x} y={y - 26} textAnchor="middle" fontFamily="var(--font-lilita), sans-serif" fontSize={16} fill="#fff" stroke={INK} strokeWidth={4} paintOrder="stroke">
            Lago de Calimocho
          </text>
        </g>
      );
    case "ufo":
      return (
        <g stroke={INK} strokeWidth={4} strokeLinejoin="round" className="mc-bob">
          <ellipse cx={x} cy={y} rx={22} ry={8} fill="#000" opacity=".2" stroke="none" />
          <path d={`M${x - 14} ${y - 50} L${x - 26} ${y - 4} L${x + 26} ${y - 4} L${x + 14} ${y - 50} Z`} fill="#fff4b0" opacity=".45" stroke="none" />
          <ellipse cx={x} cy={y - 62} rx={18} ry={16} fill="#bfeaff" />
          <ellipse cx={x} cy={y - 52} rx={42} ry={13} fill="#c0c7d6" />
          <circle cx={x - 22} cy={y - 52} r={3.5} fill="#ffe066" strokeWidth={2} />
          <circle cx={x} cy={y - 48} r={3.5} fill="#e53fd6" strokeWidth={2} />
          <circle cx={x + 22} cy={y - 52} r={3.5} fill="#5cd23c" strokeWidth={2} />
        </g>
      );
    case "flag":
      return (
        <g stroke={INK} strokeWidth={4} strokeLinejoin="round">
          <rect x={x - 3} y={y - 90} width={6} height={90} fill="#c0c7d6" />
          <path d={`M${x + 3} ${y - 88} L${x + 58} ${y - 76} L${x + 3} ${y - 62} Z`} fill="#e8344a" />
          <text x={x + 26} y={y - 70} textAnchor="middle" fontFamily="var(--font-lilita), sans-serif" fontSize={13} fill="#fff" stroke="none">
            SALIDA
          </text>
        </g>
      );
  }
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
  return `#${((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, "0")}`;
}
