import { useLayoutEffect, useRef, useState } from "react";
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
    zoom: b.zoom, // el acercamiento de la vista elegida en el editor
  };
}

/** Con zoom se ven unas 9 casillas a lo ancho, más o menos como el tablero de serie. */
const VISIBLE_CELLS = 9;

/** Tamaño del contenedor en píxeles de pantalla. */
function useBoxSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export default function IsoBoard(props: Props) {
  const published = usePublishedBoard();
  if (published === undefined) return <div className="h-full w-full" />;
  return <IsoBoardView {...props} geo={published ? publishedGeometry(published) : DEFAULT_GEOMETRY} />;
}

/**
 * Rendimiento y nitidez en la TV: la imagen del tablero se pinta UNA vez al tamaño final (ya acercada) y la cámara
 * solo la desplaza con `translate3d`, que mueve la tarjeta gráfica sin volver a pintar nada. Las fichas son capas
 * HTML aparte que también se mueven con transform. Antes se animaba el viewBox del SVG, que repintaba la imagen de
 * 8192 px en cada fotograma (todo iba lentísimo), y antes de eso se escalaba con CSS (se veía borroso).
 */
function IsoBoardView({ players, current, winner, shown, flying, focus, geo }: Props & { geo: Geometry }) {
  const [boxRef, box] = useBoxSize();
  const at = (p: Player) => shown?.[p.id] ?? p.pos;
  const k = geo.cell / 100; // escala respecto al tablero de serie
  const { view } = geo;

  const focused = players.find((p) => p.id === focus);
  const cam = focused ? geo.at(at(focused)) : null;
  const zoom = cam ? (geo.zoom ?? Math.max(1, view.w / (geo.cell * VISIBLE_CELLS))) : 1;
  // escala: el encuadre (la vista / zoom) llena la pantalla; el publicado recortando, el de serie entero
  const fit = geo.numbers ? Math.min : Math.max;
  const s = box.w && box.h ? fit(box.w / (view.w / zoom), box.h / (view.h / zoom)) : 0;
  const cw = view.w * s;
  const ch = view.h * s;
  const fx = cam ? cam.x : view.x + view.w / 2;
  const fy = cam ? cam.y - 40 * k : view.y + view.h / 2;
  const pan = (size: number, content: number, c: number) => (content <= size ? (size - content) / 2 : Math.min(0, Math.max(size - content, size / 2 - c)));
  const tx = Math.round(pan(box.w, cw, (fx - view.x) * s));
  const ty = Math.round(pan(box.h, ch, (fy - view.y) * s));
  const px = (x: number, y: number) => ({ x: (x - view.x) * s, y: (y - view.y) * s });

  // Fichas (y números del tablero de serie) ordenadas por profundidad: más abajo en pantalla = más cerca.
  const groups = new Map<number, Player[]>();
  for (const p of players) groups.set(at(p), [...(groups.get(at(p)) ?? []), p]);
  const tokens = players
    .map((p) => {
      const pos = at(p);
      const base = geo.at(pos);
      const group = groups.get(pos)!;
      const i = group.indexOf(p);
      // Varias fichas en una casilla: hasta 4 en fila a lo ancho de la losa; si son más, en cuadrícula y más chicas.
      const n = group.length;
      const cols = n <= 4 ? n : Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const hOff = ((i % cols) - (cols - 1) / 2) * (n > 4 ? 0.2 : n > 2 ? 0.24 : 0.32);
      const dOff = n > 4 ? (Math.floor(i / cols) - (rows - 1) / 2) * 0.17 : 0; // hacia delante o hacia atrás en la losa
      const mul = geo.tokenScale?.[PLAYER_COLORS.indexOf(avatarOf(p).skin.toLowerCase())] ?? 1;
      return {
        p,
        n,
        at: px(base.x + hOff * geo.cell, base.y + 4 * k + dOff * geo.cell * 0.5),
        d: base.y + 0.6 * k + dOff * geo.cell * 0.5 + i * 0.01,
        size: (n > 8 ? 46 : n > 3 ? 62 : 86) * k * mul * s,
      };
    })
    .sort((a, b) => a.d - b.d);

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden" role="img" aria-label="Tablero" style={geo.bg ? { background: geo.bg } : undefined}>
      {s > 0 && (
        <div
          className="absolute top-0 left-0"
          style={{ width: cw, height: ch, transform: `translate3d(${tx}px, ${ty}px, 0)`, transition: "transform .5s ease-in-out", willChange: "transform" }}
        >
          {/* terreno, casillas y decoración: render 3D hecho de antemano */}
          <img src={geo.image} alt="" draggable={false} decoding="async" className="absolute inset-0 h-full w-full max-w-none select-none" />
          {geo.numbers && (
            <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} width={cw} height={ch} className="pointer-events-none absolute inset-0">
              {BOARD.filter((t) => t.type !== "META").map((tile) => (
                <TileNumber key={tile.n} tile={tile} geo={geo} />
              ))}
            </svg>
          )}
          {tokens.map((t, z) => (
            <Token key={t.p.id} t={t} z={z + 1} k={k * s} current={current} winner={winner} flying={flying} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Una ficha: capa HTML propia que se mueve con transform (la tarjeta gráfica, sin repintar el tablero). */
function Token({ t, z, k, current, winner, flying }: { t: { p: Player; n: number; at: { x: number; y: number }; size: number }; z: number; k: number; current: string; winner?: string | null; flying?: string | null }) {
  const { p, n, size } = t;
  const isCurrent = p.id === current && !winner;
  const isFlying = p.id === flying;
  return (
    <div
      className="pointer-events-none absolute top-0 left-0"
      style={{
        zIndex: z,
        transform: `translate3d(${t.at.x}px, ${t.at.y}px, 0)`,
        transition: isFlying ? "transform .45s cubic-bezier(.4,-.4,.5,1.4)" : "transform .12s ease-out",
        willChange: "transform",
      }}
    >
      <div className="absolute rounded-[50%]" style={{ left: -size * 0.3, top: -size * 0.12, width: size * 0.6, height: size * 0.24, background: "#1d3b12", opacity: 0.3 }} />
      <div className={`absolute ${isFlying ? "token-fly" : ""}`} style={{ left: -size / 2, top: -size * 1.02, width: size, height: size * 1.2 }}>
        <Marciano avatar={avatarOf(p)} expression={expressionFor(p, { winner, isTurn: isCurrent })} title={p.name} size={size} animated className={isCurrent ? "mc-hop" : "mc-bob"} />
      </div>
      {/* nombre encima de cada ficha */}
      {!(n > 8 && !isCurrent) && (
        <div
          className="absolute whitespace-nowrap"
          style={{
            left: 0,
            top: -size * 1.08,
            transform: "translate(-50%, -100%)",
            fontFamily: "var(--font-lilita), sans-serif",
            fontSize: (n > 8 ? 11 : n > 3 ? 13 : 16) * k,
            lineHeight: 1,
            color: isCurrent ? "#ffe066" : "#ffffff",
            WebkitTextStroke: `${5 * k}px #1b1f4b`,
            paintOrder: "stroke fill",
          }}
        >
          {p.name}
        </div>
      )}
    </div>
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
