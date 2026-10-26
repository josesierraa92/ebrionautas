import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { BOARD, type Tile } from "@/game/board";
import type { Player } from "@/game/engine";
import { ISO_COLS, ISO_ROWS, isoPos } from "@/game/isoPath";
import { TILE_STYLE } from "@/game/tileStyle";

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
    standing.push({ d: gx + gy, key: `i${tile.n}`, el: <TileNumber tile={tile} /> });
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
    const size = group.length > 3 ? 50 : 66;
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
      if ((gx + gy) % 2 === 0) cells.push(<path key={`${gx},${gy}`} d={`M${gx - 0.5} ${gy - 0.5} h1 v1 h-1 Z`} transform={PLANE(0)} fill="#b3e26e" />);
  const shape = planeRect(I0, I0, IX, IY, 0.9);
  return (
    <g>
      <ellipse cx={sx((I0 + IX) / 2, (I0 + IY) / 2)} cy={sy(IX, IY) + ISLAND_T + 70} rx={VIEW.w * 0.4} ry={45} fill="#000" opacity=".28" />
      <Slab d={shape} top="#a2d861" side="#c08452" thickness={ISLAND_T} />
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
  const d = planeRect(gx - 0.48, gy - 0.48, gx + 0.48, gy + 0.48, 0.18);
  return (
    <g transform={`translate(0 ${-TILE_T})`}>
      <path d={d} transform={PLANE(TILE_T + 6)} fill="#2d5a1c" opacity=".2" />
      <Slab d={d} top={top} side={side} thickness={TILE_T} />
      {/* brillo en el borde de arriba */}
      <path d={planeRect(gx - 0.4, gy - 0.45, gx + 0.4, gy - 0.36, 0.05)} transform={PLANE(0)} fill="#fff" opacity=".35" />
      <g transform={`matrix(0.5 0.25 -0.5 0.25 ${sx(gx, gy)} ${sy(gx, gy)})`} opacity={0.95}>
        <TileGlyph type={tile.type} color={colored ? "#ffffff" : s.bg[1]} hole={top} />
      </g>
    </g>
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

/** Símbolo blanco pintado sobre la losa (estrella, flecha, calavera…), como en los juegos de tablero online. */
function TileGlyph({ type, color, hole }: { type: Tile["type"]; color: string; hole: string }) {
  const stroke = { fill: "none", stroke: color, strokeWidth: 7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const text = (t: string, size = 60) => (
    <text x={0} y={2} textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-lilita), sans-serif" fontSize={size} fill={color}>
      {t}
    </text>
  );
  switch (type) {
    case "SALIDA":
      return <path d="M-26 -10 H4 V-24 L28 0 L4 24 V10 H-26 Z" fill={color} />;
    case "OCA": {
      const pts = Array.from({ length: 10 }, (_, k) => {
        const r = k % 2 ? 12 : 28;
        const a = (Math.PI / 5) * k - Math.PI / 2;
        return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
      });
      return <polygon points={pts.join(" ")} fill={color} />;
    }
    case "MUERTE":
      return (
        <g>
          <circle cx={0} cy={-6} r={22} fill={color} />
          <rect x={-13} y={6} width={26} height={18} rx={5} fill={color} />
          <circle cx={-9} cy={-6} r={6.5} fill={hole} />
          <circle cx={9} cy={-6} r={6.5} fill={hole} />
          <path d="M-5 16 V24 M0 16 V24 M5 16 V24" stroke={hole} strokeWidth={2.5} />
        </g>
      );
    case "POSADA":
      return <path d="M0 -28 C14 -8 22 2 22 10 A22 22 0 0 1 -22 10 C-22 2 -14 -8 0 -28 Z" fill={color} />;
    case "A_BEBER":
      return (
        <g fill={color}>
          <path d="M-20 -26 H20 Q20 4 0 6 Q-20 4 -20 -26 Z" />
          <rect x={-3} y={4} width={6} height={16} />
          <ellipse cx={0} cy={22} rx={14} ry={4.5} />
        </g>
      );
    case "DUELO":
      return text("VS", 40);
    case "CULTURAL":
      return text("?");
    case "REGLA":
      return text("!");
    case "HIPNOSIS":
      return <path d="M0 0 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0 a20 20 0 1 1 40 0" {...stroke} strokeWidth={6} />;
    case "CARCEL":
      return (
        <g {...stroke}>
          <rect x={-22} y={-22} width={44} height={44} rx={7} />
          <path d="M-8 -22 V22 M8 -22 V22" />
        </g>
      );
    case "PATINAZO":
      return (
        <g>
          <circle cx={0} cy={0} r={14} fill={color} />
          <ellipse cx={0} cy={0} rx={29} ry={9} transform="rotate(-20)" {...stroke} strokeWidth={5} />
        </g>
      );
    case "POSICION":
      return (
        <g>
          <circle cx={-14} cy={0} r={12} fill={color} />
          <circle cx={14} cy={0} r={12} fill={color} />
          <circle cx={-10} cy={2} r={5} fill={hole} />
          <circle cx={18} cy={2} r={5} fill={hole} />
        </g>
      );
    case "RASGO":
      return (
        <g {...stroke}>
          <circle cx={-5} cy={-5} r={14} />
          <path d="M6 6 L22 22" strokeWidth={9} />
        </g>
      );
    case "ESCLAVO":
      return (
        <g {...stroke} strokeWidth={6}>
          <ellipse cx={-10} cy={0} rx={16} ry={9} transform="rotate(-25 -10 0)" />
          <ellipse cx={10} cy={0} rx={16} ry={9} transform="rotate(-25 10 0)" />
        </g>
      );
    case "RETO":
      return (
        <g>
          <rect x={-9} y={-28} width={18} height={30} rx={9} fill={color} />
          <path d="M-16 -4 Q-16 14 0 14 Q16 14 16 -4 M0 14 V24 M-10 24 H10" {...stroke} strokeWidth={5} />
        </g>
      );
    case "LABERINTO":
      return (
        <g fill={color}>
          <circle cx={-12} cy={8} r={12} />
          <circle cx={13} cy={9} r={10} />
          <circle cx={0} cy={-13} r={13} />
        </g>
      );
    case "META":
      return null;
  }
}

/** La meta: la Nave Nodriza flotando sobre la plataforma dorada, con su rayo abductor. */
function MothershipGoal() {
  const { gx, gy } = isoPos(BOARD.length);
  const x = sx(gx, gy);
  const y = sy(gx, gy);
  const d = planeRect(gx - 0.6, gy - 0.6, gx + 0.6, gy + 0.6, 0.3);
  const cy = y - 120; // centro del platillo
  return (
    <g>
      <g transform={`translate(0 ${-26})`}>
        <Slab d={d} top="#ffe066" side="#e08a12" thickness={26} />
      </g>
      <path d={`M${x - 40} ${cy + 14} L${x - 62} ${y - 26} L${x + 62} ${y - 26} L${x + 40} ${cy + 14} Z`} fill="url(#iso-beam)" className="beam-pulse" />
      <ellipse cx={x} cy={y - 26} rx={62} ry={22} fill="#b8ffef" opacity=".35" className="beam-pulse" />
      <g className="ship-hover">
        <circle cx={x} cy={cy - 30} r={120} fill="url(#iso-glow)" opacity=".6" />
        <image href="/art/deco/mothership.webp" x={x - 130} y={cy + 40 - 260} width={260} height={260} />
      </g>
      <text x={x} y={cy - 200} textAnchor="middle" fontFamily="var(--font-lilita), sans-serif" fontSize={28} fill="#ffe066" stroke="#1b1f4b" strokeWidth={7} paintOrder="stroke">
        62 · NAVE NODRIZA
      </text>
    </g>
  );
}

// Decoración en el césped: objetos 3D generados con IA (public/art/deco) y algunos dibujados (lago, cráter, letrero).
type ArtKind = "tree" | "tree2" | "ptree" | "pine" | "bush" | "mush" | "rock" | "logs" | "cauldron" | "tent" | "flowers" | "rocket";
type Deco = { gx: number; gy: number; kind: ArtKind | "pond" | "crater" | "sign" };
/** Tamaño en pantalla de cada objeto (el ancho de una casilla es 100). */
const ART_SIZE: Record<ArtKind, number> = {
  tree: 125, tree2: 135, ptree: 120, pine: 115, bush: 55, mush: 45, rock: 55, logs: 55, cauldron: 60, tent: 105, flowers: 50, rocket: 120,
};
// Entre los tramos solo cosas bajitas (lo alto taparía las casillas de detrás); árboles y tienda, en el borde.
const DECOR: Deco[] = [
  { gx: -0.8, gy: 9.8, kind: "rocket" },
  { gx: 0.4, gy: 10.1, kind: "sign" },
  // entre el primer y el segundo tramo
  { gx: 1.6, gy: 7.6, kind: "bush" },
  { gx: 3.6, gy: 7.8, kind: "mush" },
  { gx: 6.5, gy: 7.5, kind: "pond" },
  { gx: 9.2, gy: 7.9, kind: "flowers" },
  { gx: 10.6, gy: 7.5, kind: "logs" },
  { gx: 12, gy: 7.8, kind: "rock" },
  // entre el segundo y el tercero
  { gx: 1.8, gy: 4.6, kind: "flowers" },
  { gx: 3.5, gy: 4.4, kind: "cauldron" },
  { gx: 5.4, gy: 4.8, kind: "bush" },
  { gx: 7.5, gy: 4.5, kind: "crater" },
  { gx: 9.8, gy: 4.6, kind: "mush" },
  { gx: 11.8, gy: 4.4, kind: "flowers" },
  // entre el tercero y el cuarto
  { gx: 2.2, gy: 1.6, kind: "rock" },
  { gx: 4.3, gy: 1.5, kind: "bush" },
  { gx: 6.4, gy: 1.7, kind: "logs" },
  { gx: 8.6, gy: 1.6, kind: "flowers" },
  { gx: 10.4, gy: 1.5, kind: "mush" },
  { gx: 12.2, gy: 1.7, kind: "bush" },
  // bosque alrededor (detrás y a los lados)
  ...[0.3, 1.7, 4.6, 6, 8.4, 9.8, 11.2, 12.6].map((gx, i): Deco => ({ gx, gy: -1, kind: (["pine", "tree", "pine", "ptree", "tree", "pine", "tree2", "tree"] as const)[i] })),
  { gx: 3, gy: -1.1, kind: "tent" },
  { gx: 13.9, gy: -0.9, kind: "pine" },
  ...[1.6, 4.6, 7.4].map((gy, i): Deco => ({ gx: -1, gy, kind: (["tree", "pine", "ptree"] as const)[i] })),
  ...[0.4, 3.6, 6.6, 9.6].map((gy, i): Deco => ({ gx: 14.1, gy, kind: (["tree2", "pine", "tree", "pine"] as const)[i] })),
  ...[3, 6.5, 10, 12.6].map((gx, i): Deco => ({ gx, gy: 10.1, kind: (["bush", "flowers", "bush", "mush"] as const)[i] })),
];

function Decoration({ gx, gy, kind }: Deco) {
  const x = sx(gx, gy);
  const y = sy(gx, gy);
  const shadow = (rx: number, ry = rx * 0.4) => <ellipse cx={x + 4} cy={y + 2} rx={rx} ry={ry} fill="#1d3b12" opacity=".22" />;
  if (kind in ART_SIZE) {
    const size = ART_SIZE[kind as ArtKind];
    return (
      <g>
        {shadow(size * 0.28)}
        <image href={`/art/deco/${kind}.webp`} x={x - size / 2} y={y - size * 0.96} width={size} height={size} />
      </g>
    );
  }
  switch (kind) {
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
