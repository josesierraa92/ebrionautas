import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { BOARD, type Tile } from "@/game/board";
import type { Player } from "@/game/engine";
import { ISO_COLS, ISO_ROWS, isoPos } from "@/game/isoPath";
import { TILE_STYLE, tileArt } from "@/game/tileStyle";

// Tablero isométrico 2.5D: dibujos planos con volumen (losas con canto,
// sombras suaves, árboles redondeados) sobre una isla de césped flotando en el
// espacio. No necesita WebGL, así que funciona en cualquier TV.

const TW = 100; // ancho de una celda en pantalla
const TH = 50; // alto de una celda (isométrico 2:1)
const TILE_T = 10; // canto de las losas
const ISLAND_T = 46; // grosor de la isla

const sx = (gx: number, gy: number) => ((gx - gy) * TW) / 2;
const sy = (gx: number, gy: number) => ((gx + gy) * TH) / 2;
/** Transformación del plano del suelo: 1 unidad = 1 celda. */
const PLANE = (dy = 0) => `matrix(${TW / 2} ${TH / 2} ${-TW / 2} ${TH / 2} 0 ${dy})`;

const I0 = -1.3; // la isla sobresale un poco del recorrido
const IX = ISO_COLS + 0.3;
const IY = ISO_ROWS + 0.3;
const VIEW = {
  x: sx(I0, IY) - 30,
  y: sy(I0, I0) - 190,
  w: sx(IX, I0) - sx(I0, IY) + 60,
  h: sy(IX, IY) - sy(I0, I0) + ISLAND_T + 250,
};

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
    standing.push({ d: gx + gy, key: `i${tile.n}`, el: <TileIcon tile={tile} /> });
  }
  for (const deco of DECOR) standing.push({ d: deco.gx + deco.gy, key: `d${deco.kind}${deco.gx},${deco.gy}`, el: <Decoration {...deco} /> });

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
    const size = group.length > 3 ? 42 : 54;
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
      <Defs />
      <g
        style={{
          transformBox: "view-box",
          transformOrigin: "0 0",
          transform: cam ? camera(sx(cam.gx, cam.gy), sy(cam.gx, cam.gy) - 50) : "none",
          transition: "transform .5s ease-in-out",
        }}
      >
        <Island />
        {BOARD.map((t) => (t.type === "META" ? null : <TileSlab key={t.n} tile={t} />))}
        <MothershipGoal />
        {standing.map((s) => (
          <g key={s.key}>{s.el}</g>
        ))}
      </g>
    </svg>
  );
}

function Defs() {
  return (
    <defs>
      <radialGradient id="iso-leaf" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#c6f27a" />
        <stop offset="0.55" stopColor="#6fcf4a" />
        <stop offset="1" stopColor="#3f9a35" />
      </radialGradient>
      <radialGradient id="iso-leaf-purple" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#e3c6ff" />
        <stop offset="0.55" stopColor="#a774f0" />
        <stop offset="1" stopColor="#6a3fc0" />
      </radialGradient>
      <linearGradient id="iso-pine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#5fd6c8" />
        <stop offset="0.55" stopColor="#2bb3a3" />
        <stop offset="0.56" stopColor="#1f8f86" />
        <stop offset="1" stopColor="#1a7a74" />
      </linearGradient>
      <radialGradient id="iso-rock" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#f0f0f5" />
        <stop offset="0.6" stopColor="#b9bdcc" />
        <stop offset="1" stopColor="#8a8fa3" />
      </radialGradient>
      <radialGradient id="iso-water" cx="0.4" cy="0.35" r="0.8">
        <stop offset="0" stopColor="#ff8aa8" />
        <stop offset="0.6" stopColor="#d6245a" />
        <stop offset="1" stopColor="#8f1240" />
      </radialGradient>
      <linearGradient id="iso-beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b8ffef" stopOpacity=".75" />
        <stop offset="1" stopColor="#7fd3ff" stopOpacity=".1" />
      </linearGradient>
      <radialGradient id="iso-glow">
        <stop offset="0" stopColor="#fff3a0" stopOpacity=".9" />
        <stop offset="1" stopColor="#ffd23f" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="iso-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#aab3c8" />
      </linearGradient>
    </defs>
  );
}

/** Rectángulo redondeado en el plano del suelo (en unidades de celda). */
function planeRect(x0: number, y0: number, x1: number, y1: number, r: number) {
  return `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;
}

/** Extrusión: la misma forma repetida hacia abajo da el canto con volumen. */
function Slab({ d, top, side, thickness, edge }: { d: string; top: string; side: string; thickness: number; edge?: string }) {
  const steps = Math.max(3, Math.round(thickness / 4));
  return (
    <g>
      {Array.from({ length: steps }, (_, i) => (
        <path key={i} d={d} transform={PLANE(thickness - (i * thickness) / steps)} fill={side} />
      ))}
      <path d={d} transform={PLANE(0)} fill={top} stroke={edge} strokeWidth={edge ? 2 : 0} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function Island() {
  const cells: React.ReactNode[] = [];
  for (let gx = -1; gx <= ISO_COLS; gx++)
    for (let gy = -1; gy <= ISO_ROWS; gy++)
      if ((gx + gy) % 2 === 0) cells.push(<path key={`${gx},${gy}`} d={`M${gx - 0.5} ${gy - 0.5} h1 v1 h-1 Z`} transform={PLANE(0)} fill="#9fe070" />);
  const shape = planeRect(I0, I0, IX, IY, 0.9);
  return (
    <g>
      <ellipse cx={sx((I0 + IX) / 2, (I0 + IY) / 2)} cy={sy(IX, IY) + ISLAND_T + 70} rx={VIEW.w * 0.4} ry={45} fill="#000" opacity=".28" />
      <Slab d={shape} top="#8bd65f" side="#b4764a" thickness={ISLAND_T} />
      {/* franja de tierra oscura bajo el césped */}
      <path d={shape} transform={PLANE(10)} fill="none" stroke="#8a5432" strokeWidth={3} vectorEffect="non-scaling-stroke" opacity=".6" />
      <g clipPath="url(#iso-island-clip)">{cells}</g>
      <clipPath id="iso-island-clip">
        <path d={shape} transform={PLANE(0)} />
      </clipPath>
      <path d={planeRect(I0 + 0.12, I0 + 0.12, IX - 0.12, IY - 0.12, 0.8)} transform={PLANE(0)} fill="none" stroke="#c4f294" strokeWidth={4} vectorEffect="non-scaling-stroke" opacity=".7" />
    </g>
  );
}

const lighten = (hex: string, amount: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
  return `#${((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, "0")}`;
};

function TileSlab({ tile }: { tile: Tile }) {
  const { gx, gy } = isoPos(tile.n);
  const s = TILE_STYLE[tile.type];
  // Losas color crema; las de efectos fuertes, de su color (como las casillas especiales de la referencia).
  const colored = !["RETO", "RASGO", "POSICION", "CULTURAL"].includes(tile.type);
  const top = colored ? lighten(s.bg[0], 0.15) : "#fbf4e6";
  const side = colored ? lighten(s.bg[1], -0.15) : "#d8c8ab";
  const d = planeRect(gx - 0.43, gy - 0.43, gx + 0.43, gy + 0.43, 0.16);
  return (
    <g transform={`translate(0 ${-TILE_T})`}>
      <path d={d} transform={PLANE(TILE_T + 6)} fill="#2d5a1c" opacity=".22" />
      <Slab d={d} top={top} side={side} thickness={TILE_T} />
      {/* brillo en el borde de arriba */}
      <path d={planeRect(gx - 0.36, gy - 0.4, gx + 0.36, gy - 0.3, 0.05)} transform={PLANE(0)} fill="#fff" opacity=".35" />
    </g>
  );
}

/** Ícono de la casilla, de pie sobre la losa (como las monedas de los juegos de tablero online). */
function TileIcon({ tile }: { tile: Tile }) {
  const { gx, gy } = isoPos(tile.n);
  const x = sx(gx, gy);
  const y = sy(gx, gy) - TILE_T;
  return (
    <g>
      <ellipse cx={x + 2} cy={y + 2} rx={17} ry={6} fill="#000" opacity=".18" />
      <image href={tileArt(tile.type)} x={x - 30} y={y - 54} width={60} height={60} style={{ filter: "drop-shadow(0 3px 0 rgba(0,0,0,.25))" }} />
      {/* número de la casilla, de pie en el borde delantero para que el ícono no lo tape */}
      <text x={x} y={y + 18} textAnchor="middle" fontFamily="var(--font-lilita), sans-serif" fontSize={14} fill="#ffffff" stroke="#1b1f4b" strokeWidth={4} paintOrder="stroke">
        {tile.n}
      </text>
    </g>
  );
}

/** La meta: la Nave Nodriza flotando sobre la plataforma dorada, con su rayo abductor. */
function MothershipGoal() {
  const { gx, gy } = isoPos(BOARD.length);
  const x = sx(gx, gy);
  const y = sy(gx, gy);
  const d = planeRect(gx - 0.6, gy - 0.6, gx + 0.6, gy + 0.6, 0.3);
  const cy = y - 120; // centro del platillo
  const lights = [-62, -38, -13, 13, 38, 62];
  return (
    <g>
      <g transform={`translate(0 ${-26})`}>
        <Slab d={d} top="#ffe066" side="#e08a12" thickness={26} />
      </g>
      <path d={`M${x - 40} ${cy + 14} L${x - 62} ${y - 26} L${x + 62} ${y - 26} L${x + 40} ${cy + 14} Z`} fill="url(#iso-beam)" className="beam-pulse" />
      <ellipse cx={x} cy={y - 26} rx={62} ry={22} fill="#b8ffef" opacity=".35" className="beam-pulse" />
      <g className="ship-hover">
        <g transform={`translate(${x} ${cy}) scale(1.25) translate(${-x} ${-cy})`}>
          <circle cx={x} cy={cy - 6} r={92} fill="url(#iso-glow)" opacity=".7" />
          <ellipse cx={x} cy={cy + 10} rx={92} ry={24} fill="#1b1f4b" opacity=".25" />
          <path d={`M${x - 34} ${cy - 10} Q${x - 30} ${cy - 52} ${x} ${cy - 54} Q${x + 30} ${cy - 52} ${x + 34} ${cy - 10} Z`} fill="#9ff3ff" stroke="#1b1f4b" strokeWidth={4} opacity=".95" />
          <ellipse cx={x - 12} cy={cy - 36} rx={8} ry={12} fill="#fff" opacity=".6" />
          <ellipse cx={x} cy={cy} rx={96} ry={26} fill="url(#iso-metal)" stroke="#1b1f4b" strokeWidth={4} />
          <ellipse cx={x} cy={cy - 6} rx={70} ry={14} fill="#e9edff" opacity=".7" />
          <path d={`M${x - 96} ${cy} Q${x} ${cy + 46} ${x + 96} ${cy}`} fill="#6b74b8" stroke="#1b1f4b" strokeWidth={4} />
          {lights.map((dx, i) => (
            <circle key={dx} cx={x + dx} cy={cy + 14 - Math.abs(dx) * 0.12} r={6} fill={i % 2 ? "#ff5fa2" : "#ffe066"} stroke="#1b1f4b" strokeWidth={2} className="ship-light" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </g>
      </g>
      <text x={x} y={cy - 84} textAnchor="middle" fontFamily="var(--font-lilita), sans-serif" fontSize={28} fill="#ffe066" stroke="#1b1f4b" strokeWidth={7} paintOrder="stroke">
        62 · NAVE NODRIZA
      </text>
    </g>
  );
}

// Decoración en el césped entre los tramos del camino.
type Deco = { gx: number; gy: number; kind: "tree" | "ptree" | "pine" | "rock" | "mush" | "pond" | "crater" | "ufo" | "rocket" | "logs" | "flowers" | "sign" };
const DECOR: Deco[] = [
  { gx: -0.8, gy: 9.8, kind: "rocket" },
  { gx: 0.4, gy: 10.1, kind: "sign" },
  { gx: 1.5, gy: 7.6, kind: "tree" },
  { gx: 6.5, gy: 7.5, kind: "pond" },
  { gx: 3.6, gy: 7.8, kind: "mush" },
  { gx: 10.3, gy: 7.2, kind: "ptree" },
  { gx: 11.8, gy: 7.7, kind: "rock" },
  { gx: 9.2, gy: 7.9, kind: "flowers" },
  { gx: 2.4, gy: 4.5, kind: "pine" },
  { gx: 4.2, gy: 4.2, kind: "logs" },
  { gx: 7.5, gy: 4.5, kind: "crater" },
  { gx: 10.6, gy: 4.6, kind: "tree" },
  { gx: 12.3, gy: 4.2, kind: "pine" },
  { gx: 5.6, gy: 4.8, kind: "flowers" },
  { gx: 2.2, gy: 1.5, kind: "ptree" },
  { gx: 5.5, gy: 1.4, kind: "ufo" },
  { gx: 8.6, gy: 1.6, kind: "mush" },
  { gx: 10.4, gy: 1.4, kind: "tree" },
  { gx: 12.2, gy: 1.8, kind: "rock" },
  { gx: 14, gy: 9.6, kind: "pine" },
  { gx: 14, gy: 6.6, kind: "tree" },
  { gx: 13.9, gy: -0.9, kind: "pine" },
  { gx: 7.2, gy: -1, kind: "ptree" },
];

function Decoration({ gx, gy, kind }: Deco) {
  const x = sx(gx, gy);
  const y = sy(gx, gy);
  const shadow = (rx: number, ry = rx * 0.4) => <ellipse cx={x + 4} cy={y + 2} rx={rx} ry={ry} fill="#1d3b12" opacity=".25" />;
  switch (kind) {
    case "tree":
    case "ptree": {
      const leaf = kind === "tree" ? "url(#iso-leaf)" : "url(#iso-leaf-purple)";
      return (
        <g>
          {shadow(30)}
          <rect x={x - 6} y={y - 34} width={12} height={34} rx={5} fill="#a66a3c" />
          <circle cx={x - 18} cy={y - 50} r={22} fill={leaf} />
          <circle cx={x + 18} cy={y - 52} r={22} fill={leaf} />
          <circle cx={x} cy={y - 74} r={28} fill={leaf} />
        </g>
      );
    }
    case "pine":
      return (
        <g>
          {shadow(24)}
          <rect x={x - 5} y={y - 22} width={10} height={22} rx={4} fill="#8a5a33" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${x} ${y - 112 + i * 26} L${x + 30 - i * 3} ${y - 50 + i * 16} Q${x} ${y - 40 + i * 16} ${x - 30 + i * 3} ${y - 50 + i * 16} Z`} fill="url(#iso-pine)" />
          )).reverse()}
        </g>
      );
    case "rock":
      return (
        <g>
          {shadow(24)}
          <path d={`M${x - 26} ${y} q-6 -20 10 -30 q18 -12 34 2 q14 14 4 28 z`} fill="url(#iso-rock)" />
          <path d={`M${x - 4} ${y - 2} q-2 -14 12 -18`} fill="none" stroke="#fff" strokeWidth={3} opacity=".6" />
        </g>
      );
    case "mush":
      return (
        <g>
          {shadow(16)}
          <rect x={x - 5} y={y - 22} width={10} height={22} rx={5} fill="#fff4e0" />
          <path d={`M${x - 20} ${y - 20} q20 -30 40 0 z`} fill="#ff5c8a" />
          <circle cx={x - 6} cy={y - 28} r={3.5} fill="#fff" />
          <circle cx={x + 7} cy={y - 26} r={3} fill="#fff" />
          <rect x={x + 18} y={y - 12} width={6} height={12} rx={3} fill="#fff4e0" />
          <path d={`M${x + 12} ${y - 11} q9 -14 18 0 z`} fill="#ff5c8a" />
        </g>
      );
    case "pond":
      return (
        <g>
          <ellipse cx={x} cy={y} rx={88} ry={30} fill="#5aa83c" />
          <ellipse cx={x} cy={y + 2} rx={80} ry={25} fill="url(#iso-water)" />
          <ellipse cx={x - 24} cy={y - 6} rx={26} ry={6} fill="#fff" opacity=".3" />
          <ellipse cx={x + 32} cy={y + 6} rx={11} ry={5} fill="#6fcf4a" />
          <ellipse cx={x - 40} cy={y + 9} rx={9} ry={4} fill="#6fcf4a" />
        </g>
      );
    case "crater":
      return (
        <g>
          <ellipse cx={x} cy={y} rx={52} ry={22} fill="#5fae3d" />
          <ellipse cx={x} cy={y + 3} rx={40} ry={15} fill="#3f7f2a" />
          <ellipse cx={x + 6} cy={y + 6} rx={26} ry={9} fill="#2f6420" />
        </g>
      );
    case "logs":
      return (
        <g>
          {shadow(30)}
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${i * 14} ${-i * 12})`}>
              <rect x={x - 30} y={y - 16} width={50} height={16} rx={8} fill="#a66a3c" />
              <ellipse cx={x + 20} cy={y - 8} rx={6} ry={8} fill="#e8c08f" />
            </g>
          ))}
        </g>
      );
    case "flowers":
      return (
        <g>
          {[
            [-14, -2],
            [6, 4],
            [18, -6],
            [-2, -10],
          ].map(([dx, dy], i) => (
            <g key={i}>
              <circle cx={x + dx} cy={y + dy} r={5} fill="#fff" />
              <circle cx={x + dx} cy={y + dy} r={2} fill="#ffc61a" />
            </g>
          ))}
        </g>
      );
    case "ufo":
      return (
        <g className="mc-bob">
          {shadow(32, 10)}
          <path d={`M${x - 16} ${y - 74} L${x - 34} ${y - 4} L${x + 34} ${y - 4} L${x + 16} ${y - 74} Z`} fill="#fff3a0" opacity=".35" />
          <ellipse cx={x} cy={y - 92} rx={20} ry={18} fill="#bfeaff" opacity=".9" />
          <ellipse cx={x - 6} cy={y - 98} rx={6} ry={4} fill="#fff" opacity=".8" />
          <ellipse cx={x} cy={y - 80} rx={46} ry={14} fill="url(#iso-metal)" />
          {[-28, -10, 10, 28].map((dx, i) => (
            <circle key={dx} cx={x + dx} cy={y - 77 + Math.abs(dx) / 8} r={4} fill={["#ffe066", "#e53fd6", "#5cd23c", "#00d1c1"][i]} />
          ))}
        </g>
      );
    case "rocket":
      return (
        <g>
          {shadow(26)}
          <path d={`M${x - 24} ${y - 6} L${x - 16} ${y - 38} L${x - 8} ${y - 10} Z`} fill="#ef476f" />
          <path d={`M${x + 24} ${y - 6} L${x + 16} ${y - 38} L${x + 8} ${y - 10} Z`} fill="#c8143c" />
          <path d={`M${x} ${y - 120} C${x + 22} ${y - 100} ${x + 22} ${y - 40} ${x + 14} ${y - 10} L${x - 14} ${y - 10} C${x - 22} ${y - 40} ${x - 22} ${y - 100} ${x} ${y - 120} Z`} fill="url(#iso-metal)" />
          <path d={`M${x} ${y - 120} C${x + 10} ${y - 112} ${x + 16} ${y - 102} ${x + 18} ${y - 92} L${x - 18} ${y - 92} C${x - 16} ${y - 102} ${x - 10} ${y - 112} ${x} ${y - 120} Z`} fill="#ef476f" />
          <circle cx={x} cy={y - 68} r={9} fill="#4cc9f0" stroke="#fff" strokeWidth={3} />
          <path d={`M${x - 8} ${y - 10} Q${x} ${y + 14} ${x + 8} ${y - 10} Z`} fill="#ffc61a" />
        </g>
      );
    case "sign":
      return (
        <g>
          {shadow(16)}
          <rect x={x - 3} y={y - 50} width={6} height={50} rx={2} fill="#8a5a33" />
          <rect x={x - 34} y={y - 62} width={68} height={24} rx={6} fill="#a66a3c" />
          <text x={x} y={y - 44} textAnchor="middle" fontFamily="var(--font-lilita), sans-serif" fontSize={15} fill="#fff4e0">
            SALIDA
          </text>
        </g>
      );
  }
}
