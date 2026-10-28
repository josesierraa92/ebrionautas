import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { BOARD, type Tile } from "@/game/board";
import type { Player } from "@/game/engine";
import { ISO_VIEW, isoPos, isoSx as sx, isoSy as sy } from "@/game/isoPath";
import type { PublishedBoard } from "@/game/publishedBoard";
import { PLAYER_COLORS } from "@/game/tileStyle";
import { usePublishedBoard } from "@/lib/usePublishedBoard";

// Tablero isométrico de la TV. El tablero (terreno, casillas, decoración) es una imagen renderizada en 3D de
// antemano: la publicada desde el editor (/admin/editor) o, si no hay, la de serie (scripts/board3d). Aquí solo
// se mueven encima las fichas. No necesita WebGL, así que funciona en cualquier TV.

const TILE_T = 10; // alto del canto de las losas del tablero de serie (en píxeles SVG)

type Props = {
  players: Player[];
  current: string;
  winner?: string | null;
  shown?: Record<string, number>;
  flying?: string | null;
  /** Ficha que sigue la cámara (siempre con zoom); null = tablero entero. */
  focus?: string | null;
};

type View = { x: number; y: number; w: number; h: number };

/** Lo que cambia entre el tablero de serie y uno publicado. */
type Geometry = {
  view: View;
  image: string;
  /** Punto de la cara de arriba de la casilla n donde se apoyan las fichas. */
  at: (n: number) => { x: number; y: number };
  /** Ancho del rombo de una casilla en píxeles (100 en el de serie). */
  cell: number;
  /** El de serie pinta los números encima; el publicado ya los trae en la imagen. */
  numbers: boolean;
  bg?: string;
  /** Tamaño de cada ficha propia respecto al zombi de serie, por color de jugador (PLAYER_COLORS). */
  tokenScale?: (number | null)[];
  /** Zoom de la cámara al seguir una ficha (si falta, el que deja ver unas VISIBLE_CELLS casillas). */
  zoom?: number;
};

const DEFAULT_GEOMETRY: Geometry = {
  view: ISO_VIEW,
  image: "/art/board.webp",
  at: (n) => {
    const { gx, gy } = isoPos(n);
    return { x: sx(gx, gy), y: sy(gx, gy) - TILE_T };
  },
  cell: 100,
  numbers: true,
  zoom: 1.8, // el usuario lo quiere siempre así de cerca
};

function publishedGeometry(b: PublishedBoard): Geometry {
  return {
    view: { x: 0, y: 0, w: b.width, h: b.height },
    image: b.image,
    at: (n) => b.tiles[Math.min(Math.max(n, 1), b.tiles.length) - 1],
    cell: b.cell,
    numbers: false,
    bg: b.bg,
    // solo cambia el tamaño de las fichas que el admin personalizó
    tokenScale: (b.tokens ?? []).map((t, i) => (t ? (b.tokenScale?.[i] ?? 1) : null)),
  };
}

/** Con zoom se ven unas 9 casillas a lo ancho, más o menos como el tablero de serie. */
const VISIBLE_CELLS = 9;

/** Transformación de cámara: acerca el tablero centrado en (x, y), sin salirse de la vista. */
function camera(view: View, zoom: number, x: number, y: number) {
  const halfW = view.w / (2 * zoom);
  const halfH = view.h / (2 * zoom);
  const fx = Math.min(Math.max(x, view.x + halfW), view.x + view.w - halfW);
  const fy = Math.min(Math.max(y, view.y + halfH), view.y + view.h - halfH);
  const tx = view.x + view.w / 2 - zoom * fx;
  const ty = view.y + view.h / 2 - zoom * fy;
  return `translate(${tx}px, ${ty}px) scale(${zoom})`;
}

export default function IsoBoard(props: Props) {
  const published = usePublishedBoard();
  if (published === undefined) return <div className="h-full w-full" />;
  return <IsoBoardView {...props} geo={published ? publishedGeometry(published) : DEFAULT_GEOMETRY} />;
}

function IsoBoardView({ players, current, winner, shown, flying, focus, geo }: Props & { geo: Geometry }) {
  const at = (p: Player) => shown?.[p.id] ?? p.pos;
  const k = geo.cell / 100; // escala respecto al tablero de serie
  const { view } = geo;

  // Todo lo que va "de pie" se ordena por profundidad (más abajo en pantalla = más cerca) para que lo de
  // delante tape a lo de atrás.
  const standing: { d: number; key: string; el: React.ReactNode }[] = [];
  if (geo.numbers)
    for (const tile of BOARD) {
      if (tile.type === "META") continue;
      standing.push({ d: geo.at(tile.n).y, key: `i${tile.n}`, el: <TileNumber tile={tile} geo={geo} /> });
    }

  const groups = new Map<number, Player[]>();
  for (const p of players) groups.set(at(p), [...(groups.get(at(p)) ?? []), p]);
  for (const p of players) {
    const pos = at(p);
    const base = geo.at(pos);
    const group = groups.get(pos)!;
    const i = group.indexOf(p);
    // Varias fichas en una casilla: en fila a lo ancho de la losa.
    const off = (i - (group.length - 1) / 2) * (group.length > 2 ? 0.24 : 0.32);
    const x = base.x + off * geo.cell;
    const y = base.y + 4 * k;
    const mul = geo.tokenScale?.[PLAYER_COLORS.indexOf(avatarOf(p).skin.toLowerCase())] ?? 1;
    const size = (group.length > 3 ? 64 : 86) * k * mul;
    const isCurrent = p.id === current && !winner;
    const isFlying = p.id === flying;
    standing.push({
      d: base.y + 0.6 * k + i * 0.01,
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
            <svg x={-size / 2} y={-size * 1.02} width={size} height={size * 1.2} overflow="visible">
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
          {/* nombre encima de cada ficha */}
          <text
            x={0}
            y={-size * 1.08}
            textAnchor="middle"
            fontFamily="var(--font-lilita), sans-serif"
            fontSize={(group.length > 3 ? 13 : 16) * k}
            fill={isCurrent ? "#ffe066" : "#ffffff"}
            stroke="#1b1f4b"
            strokeWidth={5 * k}
            paintOrder="stroke"
          >
            {p.name}
          </text>
        </g>
      ),
    });
  }
  standing.sort((a, b) => a.d - b.d);

  const focused = players.find((p) => p.id === focus);
  const cam = focused ? geo.at(at(focused)) : null;
  const zoom = geo.zoom ?? Math.max(1, view.w / (geo.cell * VISIBLE_CELLS));

  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      // el tablero publicado llena la pantalla (recortando un poco si hace falta); el de serie se ve entero
      preserveAspectRatio={geo.numbers ? undefined : "xMidYMid slice"}
      className="h-full w-full"
      role="img"
      aria-label="Tablero"
      style={geo.bg ? { background: geo.bg } : undefined}
    >
      <g
        style={{
          transformBox: "view-box",
          transformOrigin: "0 0",
          transform: cam ? camera(view, zoom, cam.x, cam.y - 40 * k) : "none",
          transition: "transform .5s ease-in-out",
        }}
      >
        {/* terreno, casillas y decoración: render 3D hecho de antemano */}
        <image href={geo.image} x={view.x} y={view.y} width={view.w} height={view.h} />
        {standing.map((s) => (
          <g key={s.key}>{s.el}</g>
        ))}
      </g>
    </svg>
  );
}

/** Número de la casilla (tablero de serie), de pie en el borde delantero de la losa. */
function TileNumber({ tile, geo }: { tile: Tile; geo: Geometry }) {
  const { x, y } = geo.at(tile.n);
  return (
    <text x={x} y={y + 21} textAnchor="middle" fontFamily="var(--font-lilita), sans-serif" fontSize={13} fill="#ffffff" stroke="#1b1f4b" strokeWidth={4} paintOrder="stroke">
      {tile.n}
    </text>
  );
}
