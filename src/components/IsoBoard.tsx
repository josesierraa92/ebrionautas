import { useLayoutEffect, useRef, useState } from "react";
import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { BOARD, type Tile } from "@/game/board";
import type { Player } from "@/game/engine";
import { ISO_VIEW, isoPos, isoSx as sx, isoSy as sy } from "@/game/isoPath";
import type { PublishedBoard } from "@/game/publishedBoard";
import { CHARACTER_HEIGHT, characterOf, SHEET_COLS, CHARACTERS, spriteOf, STOCK_SHEET, type CharacterSheet } from "@/game/characters";
import { PLAYER_COLORS } from "@/game/tileStyle";
import { FLY_MS, STEP_MS } from "@/lib/useGameFx";
import LiveBoard from "@/components/LiveBoard";
import { usePublishedBoard, usePublishedLayout } from "@/lib/usePublishedBoard";

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
  /** Hoja de los personajes zombi (los que no tienen ficha propia). */
  sheet: CharacterSheet;
  /** Tamaño de los personajes zombi (el elegido en el editor; 1 = el de serie). */
  characterScale: number;
  /** El tablero en alta resolución, en mosaicos (si no, solo `image`). */
  chunks?: PublishedBoard["chunks"];
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
  sheet: STOCK_SHEET,
  characterScale: 1,
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
    sheet: b.characters ?? STOCK_SHEET, // dibujados con el mismo ángulo que el tablero
    characterScale: b.characterScale ?? 1,
    chunks: b.chunks,
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

/** ¿Se pidió el tablero en imagen? (`?imagen` en la dirección, o lo recuerda esta TV si el 3D le fue mal). */
function wantsImage() {
  try {
    if (new URLSearchParams(location.search).has("imagen")) return true;
    // si el 3D fue lento en esta TV se queda en imagen un rato (media hora), no para siempre: así una racha mala no la
    // deja sin animaciones
    const t = Number(localStorage.getItem("ebrio:tablero-imagen"));
    return t > Date.now();
  } catch {
    return false;
  }
}

/**
 * Tablero de la TV. Si hay diseño publicado, se dibuja en **3D en vivo** (`LiveBoard`: nítido a la resolución de la
 * pantalla, como un videojuego); mientras carga, y si el aparato no tiene 3D o va lento, se ve la imagen pre-renderizada.
 */
export default function IsoBoard(props: Props) {
  const published = usePublishedBoard();
  const [mode, setMode] = useState<"loading" | "on" | "off">(() => (typeof window !== "undefined" && wantsImage() ? "off" : "loading"));
  const layout = usePublishedLayout(!!published?.live && mode !== "off");
  if (published === undefined) return <div className="h-full w-full" />;
  const geo = published ? publishedGeometry(published) : DEFAULT_GEOMETRY;
  return (
    <div className="relative h-full w-full">
      {mode !== "on" && <IsoBoardView {...props} geo={geo} />}
      {layout && mode !== "off" && (
        <LiveBoard
          layout={layout}
          players={props.players}
          current={props.current}
          winner={props.winner}
          shown={props.shown}
          flying={props.flying}
          focus={props.focus}
          characterScale={geo.characterScale}
          onReady={() => setMode("on")}
          onFail={(why) => {
            console.warn("Tablero 3D desactivado:", why);
            if (why === "lento")
              try {
                localStorage.setItem("ebrio:tablero-imagen", String(Date.now() + 30 * 60 * 1000));
              } catch {}
            setMode("off");
          }}
        />
      )}
    </div>
  );
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

  // Hacia dónde va cada ficha (adelante o atrás en el recorrido), para dibujar el personaje mirando hacia allí.
  const moves = useRef(new Map<string, { pos: number; dir: number }>());
  const last = BOARD.length;
  const facing = (p: Player) => {
    const pos = at(p);
    const prev = moves.current.get(p.id);
    const dir = !prev || prev.pos === pos ? (prev?.dir ?? 1) : pos > prev.pos ? 1 : -1;
    moves.current.set(p.id, { pos, dir });
    const moving = pos !== p.pos;
    const a = geo.at(pos);
    // caminando: en el sentido del paso que acaba de dar; quieto: mirando a la casilla siguiente
    const from = moving ? geo.at(Math.min(last, Math.max(1, pos - dir))) : a;
    const to = moving ? a : geo.at(Math.min(last, pos + 1));
    let [dx, dy] = [to.x - from.x, to.y - from.y];
    if (!moving && pos === last) [dx, dy] = [a.x - geo.at(last - 1).x, a.y - geo.at(last - 1).y];
    return { dx, dy, pose: moving ? (pos % 2 ? "walkA" : "walkB") : "idle" } as const;
  };

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
      const custom = geo.tokenScale?.[PLAYER_COLORS.indexOf(avatarOf(p).skin.toLowerCase())];
      const size = (n > 8 ? 46 : n > 3 ? 62 : 86) * k * (custom ?? 1) * s; // 86 = TOKEN_TO_TILE de una casilla
      // sin ficha propia del editor: el personaje zombi (hombre o mujer) mirando hacia donde va
      const f = facing(p);
      const sprite = custom == null ? spriteOf(characterOf(players, p.id), f.dx, f.dy, f.pose) : null;
      return {
        p,
        n,
        at: px(base.x + hOff * geo.cell, base.y + 4 * k + dOff * geo.cell * 0.5),
        d: base.y + 0.6 * k + dOff * geo.cell * 0.5 + i * 0.01,
        size,
        sprite,
        moving: f.pose !== "idle",
      };
    })
    .sort((a, b) => a.d - b.d);

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden" role="img" aria-label="Tablero" style={geo.bg ? { background: geo.bg } : undefined}>
      {s > 0 && (
        <div
          className="absolute top-0 left-0"
          style={{ width: cw, height: ch, transform: `translate3d(${tx}px, ${ty}px, 0)`, transition: "transform 1.1s cubic-bezier(.45,0,.3,1)", willChange: "transform" }}
        >
          {/* terreno, casillas y decoración: render 3D hecho de antemano */}
          <img src={geo.image} alt="" draggable={false} decoding="async" className="absolute inset-0 h-full w-full max-w-none select-none" />
          {/* en alta resolución: los mosaicos encima de la imagen pequeña (que se ve mientras cargan). Cada uno se
              solapa 1 px con el siguiente para que no se vean costuras */}
          {geo.chunks?.urls.map((url, i) => {
            const { size, cols } = geo.chunks!;
            const [x, y] = [(i % cols) * size, Math.floor(i / cols) * size];
            const [w, h] = [Math.min(size, view.w - x), Math.min(size, view.h - y)];
            const left = Math.floor(x * s);
            const top = Math.floor(y * s);
            return (
              <img
                key={url}
                src={url}
                alt=""
                draggable={false}
                decoding="async"
                className="absolute max-w-none select-none"
                style={{ left, top, width: Math.ceil((x + w) * s) - left + 1, height: Math.ceil((y + h) * s) - top + 1 }}
              />
            );
          })}
          {geo.numbers && (
            <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} width={cw} height={ch} className="pointer-events-none absolute inset-0">
              {BOARD.filter((t) => t.type !== "META").map((tile) => (
                <TileNumber key={tile.n} tile={tile} geo={geo} />
              ))}
            </svg>
          )}
          {tokens.map((t, z) => (
            <Token key={t.p.id} t={t} z={z + 1} k={k * s} sheet={geo.sheet} scale={geo.characterScale} current={current} winner={winner} flying={flying} />
          ))}
        </div>
      )}
    </div>
  );
}

type TokenData = { p: Player; n: number; at: { x: number; y: number }; size: number; sprite: ReturnType<typeof spriteOf> | null; moving: boolean };

/** Una ficha: capa HTML propia que se mueve con transform (la tarjeta gráfica, sin repintar el tablero). */
function Token({ t, z, k, sheet, scale, current, winner, flying }: { t: TokenData; z: number; k: number; sheet: CharacterSheet; scale: number; current: string; winner?: string | null; flying?: string | null }) {
  const { p, n, size, sprite } = t;
  const isCurrent = p.id === current && !winner;
  const isFlying = p.id === flying;
  // personaje: más o menos del tamaño de un zombi de la decoración (~0,4 de la ficha); el dibujo es `span` veces
  // más alto, con los pies en `feet`
  const charH = size * CHARACTER_HEIGHT * scale;
  const h = charH * sheet.span;
  const w = (h * sheet.cw) / sheet.ch;
  const top = sprite ? charH * 1.12 : size * 1.08; // dónde va el nombre, por encima de la cabeza
  return (
    <div
      className="pointer-events-none absolute top-0 left-0"
      style={{
        zIndex: z,
        transform: `translate3d(${t.at.x}px, ${t.at.y}px, 0)`,
        // un paso por casilla, sin pausas entre uno y otro; el vuelo, con un poco de rebote
        transition: isFlying ? `transform ${FLY_MS}ms cubic-bezier(.4,-.4,.5,1.4)` : `transform ${STEP_MS}ms cubic-bezier(.45,0,.55,1)`,
        willChange: "transform",
      }}
    >
      {sprite ? (
        <>
          {/* sombra suave bajo los pies */}
          <div className="absolute rounded-[50%]" style={{ left: -charH * 0.32, top: -charH * 0.1, width: charH * 0.64, height: charH * 0.2, background: "radial-gradient(closest-side, #000a, #0000)" }} />
          <div className={`absolute ${isFlying ? "token-fly" : ""}`} style={{ left: -w / 2, top: -h * sheet.feet, width: w, height: h }}>
            {/* respira (capa de fuera) y mira a la izquierda en espejo (capa de dentro): dos transform distintos */}
            <div
              className="zb-breathe h-full w-full"
              style={{ ["--zb-delay" as string]: `${-((p.id.charCodeAt(p.id.length - 1) % 7) * 0.4)}s`, transformOrigin: `50% ${sheet.feet * 100}%` }}
            >
              <div
                role="img"
                aria-label={p.name}
                className="h-full w-full"
                style={{
                  backgroundImage: `url(${sheet.image})`,
                  backgroundSize: `${w * SHEET_COLS}px ${h * CHARACTERS.length}px`,
                  backgroundPosition: `${-sprite.col * w}px ${-sprite.row * h}px`,
                  transform: sprite.mirror ? "scaleX(-1)" : undefined,
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="absolute rounded-[50%]" style={{ left: -size * 0.3, top: -size * 0.12, width: size * 0.6, height: size * 0.24, background: "#1d3b12", opacity: 0.3 }} />
          <div className={`absolute ${isFlying ? "token-fly" : ""}`} style={{ left: -size / 2, top: -size * 1.02, width: size, height: size * 1.2 }}>
            <Marciano avatar={avatarOf(p)} expression={expressionFor(p, { winner, isTurn: isCurrent })} title={p.name} size={size} animated className={isCurrent ? "mc-hop" : "mc-bob"} />
          </div>
        </>
      )}
      {/* nombre encima de cada ficha */}
      {!(n > 8 && !isCurrent) && (
        <div
          className="live-name"
          data-name={p.name}
          style={{
            left: 0,
            top: -top,
            transform: "translate(-50%, -100%)",
            fontFamily: "var(--font-lilita), sans-serif",
            fontSize: (n > 8 ? 11 : n > 3 ? 13 : 16) * k,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            color: p.color, // el color del jugador, con contorno azul oscuro y blanco (clase live-name)
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
