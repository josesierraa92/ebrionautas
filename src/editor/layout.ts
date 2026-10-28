import { BOARD, TILE_NAMES, type Tile } from "@/game/board";
import { TILE_STYLE } from "@/game/tileStyle";
import { DEFAULT_ICON, iconValue } from "./icons";

// Diseño del tablero hecho en el editor (/admin/editor): un terreno de celdas pintables con altura
// y los modelos 3D colocados encima. Funciones puras: el editor y el servidor comparten este formato.

/** Tipos de suelo que se pueden pintar. `top` es la cara de arriba y `side` los lados del bloque. */
export const GROUNDS = {
  grass: { label: "Pasto", top: "#6fa13a", side: "#7a5534" },
  darkGrass: { label: "Pasto oscuro", top: "#3f5a35", side: "#3d2e25" },
  dryGrass: { label: "Pasto seco", top: "#a39a52", side: "#6e5236" },
  dirt: { label: "Tierra", top: "#8a6440", side: "#6b4a2e" },
  mud: { label: "Barro", top: "#4a3a2c", side: "#382b20" },
  sand: { label: "Arena", top: "#d9c38a", side: "#b39a62" },
  stone: { label: "Piedra", top: "#8d8f8c", side: "#6b6d6b" },
  path: { label: "Adoquín", top: "#a59b8a", side: "#7c7366" },
  ash: { label: "Ceniza", top: "#4b4b4f", side: "#333336" },
  snow: { label: "Nieve", top: "#e8eef2", side: "#b9c3c9" },
  water: { label: "Agua", top: "#2a9fb8", side: "#5e3f26" },
  toxic: { label: "Agua tóxica", top: "#6fbf3a", side: "#3a3a2a" },
} as const;
export type GroundId = keyof typeof GROUNDS;
export const GROUND_IDS = Object.keys(GROUNDS) as GroundId[];
export const LIQUIDS: GroundId[] = ["water", "toxic"];

/** Ambientes de luz del editor (y del render final). */
export const LIGHTS = {
  dia: "Día",
  atardecer: "Atardecer",
  noche: "Noche",
  niebla: "Niebla",
} as const;
export type LightId = keyof typeof LIGHTS;

/** Alto de cada nivel de terreno (en casillas). */
export const LEVEL = 0.25;
export const MAX_LEVEL = 16;
export const MIN_SIZE = 8;
export const MAX_SIZE = 64;

export type PlacedObject = {
  id: string;
  /** Id del catálogo: "<kit>/<archivo sin .glb>", p. ej. "cementerio/grave". */
  model: string;
  x: number;
  y: number;
  z: number;
  /** Giros en radianes. */
  rx: number;
  ry: number;
  rz: number;
  /** Tamaño (escala uniforme). */
  s: number;
  /** Estiramiento a lo ancho/largo del modelo (para que una losa ocupe casillas enteras). Por defecto 1. */
  sx?: number;
  sz?: number;
  /** Luz que emite el objeto (un farol, una vela…). Si falta, los que emiten luz por su nombre la traen por defecto. */
  light?: ObjectLight;
};

export type ObjectLight = { on: boolean; color: string; intensity: number; distance: number };
export const DEFAULT_LIGHT: ObjectLight = { on: true, color: "#ffb347", intensity: 35, distance: 9 };
export const LIGHT_LIMITS = { intensity: { min: 5, max: 200 }, distance: { min: 2, max: 30 } };
const EMITTERS = /(lantern|candle|jackolantern|lightpost|fire|torch|campfire|brazier)/i;
/** Los faroles, velas, hogueras y calabazas con vela brillan solos (hace falta luz de noche). */
export const isEmitter = (model: string) => EMITTERS.test(model.split("/")[1] ?? "");
/** La luz con la que se dibuja un objeto: la suya, o la de serie si es de los que brillan. */
export const lightOf = (o: PlacedObject): ObjectLight | null => o.light ?? (isEmitter(o.model) ? DEFAULT_LIGHT : null);

export type BoardLayout = {
  version: 1;
  w: number;
  h: number;
  /** Suelo de cada celda, fila a fila: índice y * w + x. */
  ground: GroundId[];
  /** Nivel de altura de cada celda (0..MAX_LEVEL). */
  height: number[];
  objects: PlacedObject[];
  light: LightId;
  /** Fuerza de las sombras (0 = sin sombra, 1 = sombra negra). */
  shadow: number;
  /** Neblina que esconde el terreno de fuera de la zona editable (0 = nada, 1 = muy espesa). */
  mist: number;
  /**
   * Casillas del juego: la casilla n está en tiles[n - 1]. Cada una ocupa TILE_SIZE × TILE_SIZE celdas y (x, y)
   * es su celda de arriba a la izquierda. Hacen falta las 62 para publicar.
   */
  tiles: Cell[];
  /** Aspecto de cada tipo de casilla elegido en el editor (si falta, el de TILE_STYLE). */
  tileStyles: Partial<Record<TileType, TileLook>>;
  /** Aspecto de los números de las casillas. */
  numbers: NumberStyle;
};

export type Cell = { x: number; y: number };

/** Tipos de letra para los números de las casillas (fuentes de Google ya incluidas en la app o en el editor). */
export const NUMBER_FONTS = {
  lilita: { label: "Lilita One (juego)", cssVar: "--font-lilita", fallback: "'Arial Black', sans-serif" },
  fredoka: { label: "Fredoka (redondeada)", cssVar: "--font-fredoka", fallback: "'Trebuchet MS', sans-serif" },
  bangers: { label: "Bangers (cómic)", cssVar: "--font-bangers", fallback: "Impact, sans-serif" },
  creepster: { label: "Creepster (terror)", cssVar: "--font-creepster", fallback: "Impact, sans-serif" },
  pixel: { label: "Press Start 2P (pixel)", cssVar: "--font-pixel", fallback: "monospace" },
  blackops: { label: "Black Ops One (militar)", cssVar: "--font-blackops", fallback: "Impact, sans-serif" },
} as const;
export type NumberFont = keyof typeof NUMBER_FONTS;

/** Dónde va el número en la losa, tal como se ve en pantalla desde la cámara de la TV. */
export const NUMBER_POSITIONS = {
  front: "Abajo",
  back: "Arriba",
  left: "Izquierda",
  right: "Derecha",
  center: "Centro",
} as const;
export type NumberPosition = keyof typeof NUMBER_POSITIONS;

/** Cómo se ven los números de las casillas (igual para las 62). */
export type NumberStyle = { show: boolean; size: number; font: NumberFont; pos: NumberPosition };
export const DEFAULT_NUMBERS: NumberStyle = { show: true, size: 130, font: "lilita", pos: "front" };
export const NUMBER_SIZE = { min: 50, max: 260 };
export type TileType = Tile["type"];
/**
 * color: fondo de la losa; icon: un emoji o una imagen subida (data:image/...);
 * kind: "vivid" (colores de videojuego, para las casillas importantes) o "road" (asfalto con el icono pintado
 * como una señal de carretera, para que el resto no chille con la ciudad).
 */
export type TileLook = { color?: string; icon?: string; kind?: TileKind; iconColor?: string };
export type TileKind = "vivid" | "road";

/** Lado de una casilla del juego, en celdas de la rejilla (el usuario las quiere de 2×2). */
export const TILE_SIZE = 2;

/** Casillas importantes: por defecto van en colores vivos; el resto, estilo carretera. */
const VIVID: Partial<Record<TileType, string>> = {
  SALIDA: "#36c95a", // verde: aquí empieza todo
  META: "#ffc61a", // amarillo: la meta
  OCA: "#9b5de5", // morado: el murciélago hace saltar
  POSADA: "#ffc61a",
  LABERINTO: "#9b5de5",
  CARCEL: "#ff7a1a",
  MUERTE: "#7a2fd0",
  ESCLAVO: "#e8344a",
};

export const TILE_COUNT = BOARD.length;
export const TILE_TYPES = Object.keys(TILE_NAMES) as TileType[];
/** Tipo de juego de la casilla n (las reglas no cambian: solo dónde y cómo se ve). */
export const tileTypeOf = (n: number): TileType => BOARD[n - 1].type;

export const DEFAULT_MIST = 0.8;

export function newLayout(w = 32, h = 24): BoardLayout {
  return {
    version: 1,
    w,
    h,
    ground: Array<GroundId>(w * h).fill("grass"),
    height: Array<number>(w * h).fill(2),
    objects: [],
    light: "dia",
    shadow: 0.45,
    mist: DEFAULT_MIST,
    tiles: [],
    tileStyles: {},
    numbers: DEFAULT_NUMBERS,
  };
}

export const inside = (l: BoardLayout, x: number, y: number) => x >= 0 && y >= 0 && x < l.w && y < l.h;
export const cellIndex = (l: BoardLayout, x: number, y: number) => y * l.w + x;

/** Celdas de un pincel cuadrado de lado `size` centrado en (cx, cy). */
export function brushCells(l: BoardLayout, cx: number, cy: number, size: number): number[] {
  const r0 = -Math.floor((size - 1) / 2);
  const out: number[] = [];
  for (let dy = r0; dy < r0 + size; dy++)
    for (let dx = r0; dx < r0 + size; dx++) if (inside(l, cx + dx, cy + dy)) out.push(cellIndex(l, cx + dx, cy + dy));
  return out;
}

export function paint(l: BoardLayout, cx: number, cy: number, size: number, ground: GroundId): BoardLayout {
  const cells = brushCells(l, cx, cy, size).filter((i) => l.ground[i] !== ground);
  if (!cells.length) return l;
  const next = l.ground.slice();
  for (const i of cells) next[i] = ground;
  return { ...l, ground: next };
}

/** Sube (delta > 0) o baja el terreno del pincel. */
export function raise(l: BoardLayout, cx: number, cy: number, size: number, delta: number): BoardLayout {
  const next = l.height.slice();
  let changed = false;
  for (const i of brushCells(l, cx, cy, size)) {
    const v = Math.max(0, Math.min(MAX_LEVEL, next[i] + delta));
    if (v !== next[i]) changed = true;
    next[i] = v;
  }
  return changed ? { ...l, height: next } : l;
}

/** Deja el pincel a una altura dada (para aplanar). */
export function flatten(l: BoardLayout, cx: number, cy: number, size: number, level: number): BoardLayout {
  const next = l.height.slice();
  let changed = false;
  for (const i of brushCells(l, cx, cy, size))
    if (next[i] !== level) {
      next[i] = level;
      changed = true;
    }
  return changed ? { ...l, height: next } : l;
}

/** Cambia el tamaño del mundo conservando lo pintado; lo que queda fuera se pierde. */
export function resize(l: BoardLayout, w: number, h: number): BoardLayout {
  w = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(w)));
  h = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(h)));
  const out = newLayout(w, h);
  for (let y = 0; y < Math.min(h, l.h); y++)
    for (let x = 0; x < Math.min(w, l.w); x++) {
      out.ground[y * w + x] = l.ground[cellIndex(l, x, y)];
      out.height[y * w + x] = l.height[cellIndex(l, x, y)];
    }
  return { ...out, light: l.light, shadow: l.shadow, mist: l.mist, tileStyles: l.tileStyles, numbers: l.numbers, tiles: l.tiles.filter((t) => t.x + TILE_SIZE <= w && t.y + TILE_SIZE <= h), objects: l.objects.filter((o) => o.x >= 0 && o.z >= 0 && o.x <= w && o.z <= h) };
}

/** Altura (en unidades del mundo) de la superficie de una celda. Los líquidos quedan un poco hundidos. */
export function surfaceY(l: BoardLayout, i: number): number {
  return l.height[i] * LEVEL - (LIQUIDS.includes(l.ground[i]) ? 0.15 : 0);
}

/** Altura del suelo en un punto del mundo (x, z), para apoyar los modelos. */
export function groundAt(l: BoardLayout, x: number, z: number): number {
  const cx = Math.min(l.w - 1, Math.max(0, Math.floor(x)));
  const cy = Math.min(l.h - 1, Math.max(0, Math.floor(z)));
  return surfaceY(l, cellIndex(l, cx, cy));
}

export function newObjectId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Valida un diseño que viene de fuera (archivo importado, servidor). Devuelve null si no sirve. */
export function parseLayout(raw: unknown): BoardLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const w = num(r.w);
  const h = num(r.h);
  if (r.version !== 1 || !Number.isInteger(w) || !Number.isInteger(h) || w < MIN_SIZE || h < MIN_SIZE || w > MAX_SIZE || h > MAX_SIZE)
    return null;
  if (!Array.isArray(r.ground) || !Array.isArray(r.height) || r.ground.length !== w * h || r.height.length !== w * h) return null;
  const ground = r.ground.map((g) => (GROUND_IDS.includes(g as GroundId) ? (g as GroundId) : "grass"));
  const height = r.height.map((v) => Math.max(0, Math.min(MAX_LEVEL, Math.round(num(v)))));
  const objects: PlacedObject[] = [];
  for (const o of Array.isArray(r.objects) ? r.objects : []) {
    if (!o || typeof o !== "object") continue;
    const p = o as Record<string, unknown>;
    if (typeof p.model !== "string" || !/^[\w-]+\/[\w.-]+$/.test(p.model)) continue;
    objects.push({
      id: typeof p.id === "string" && p.id ? p.id.slice(0, 20) : newObjectId(),
      model: p.model,
      x: num(p.x),
      y: num(p.y),
      z: num(p.z),
      rx: num(p.rx),
      ry: num(p.ry),
      rz: num(p.rz),
      s: Math.max(0.05, Math.min(20, num(p.s, 1))),
    });
    const last = objects[objects.length - 1];
    if (p.light && typeof p.light === "object") {
      const lt = p.light as Record<string, unknown>;
      last.light = {
        on: typeof lt.on === "boolean" ? lt.on : true,
        color: typeof lt.color === "string" && /^#[0-9a-f]{6}$/i.test(lt.color) ? lt.color : DEFAULT_LIGHT.color,
        intensity: Math.max(LIGHT_LIMITS.intensity.min, Math.min(LIGHT_LIMITS.intensity.max, num(lt.intensity, DEFAULT_LIGHT.intensity))),
        distance: Math.max(LIGHT_LIMITS.distance.min, Math.min(LIGHT_LIMITS.distance.max, num(lt.distance, DEFAULT_LIGHT.distance))),
      };
    }
    for (const k of ["sx", "sz"] as const) {
      const v = Math.max(0.1, Math.min(10, num(p[k], 1)));
      if (v !== 1) last[k] = v;
    }
  }
  const light = typeof r.light === "string" && r.light in LIGHTS ? (r.light as LightId) : "dia";
  const shadow = Math.max(0, Math.min(1, num(r.shadow, 0.45)));
  const mist = Math.max(0, Math.min(1, num(r.mist, DEFAULT_MIST)));
  const tiles: Cell[] = [];
  for (const t of Array.isArray(r.tiles) ? r.tiles : []) {
    const c = t as Record<string, unknown>;
    const x = num(c?.x, -1);
    const y = num(c?.y, -1);
    const fits = Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + TILE_SIZE <= w && y + TILE_SIZE <= h;
    if (tiles.length < TILE_COUNT && fits && !tiles.some((o) => overlaps(o, x, y))) tiles.push({ x, y });
  }
  const tileStyles: Partial<Record<TileType, TileLook>> = {};
  if (r.tileStyles && typeof r.tileStyles === "object")
    for (const [k, v] of Object.entries(r.tileStyles as Record<string, unknown>)) {
      if (!TILE_TYPES.includes(k as TileType) || !v || typeof v !== "object") continue;
      const look = v as Record<string, unknown>;
      const out: TileLook = {};
      if (typeof look.color === "string" && /^#[0-9a-f]{6}$/i.test(look.color)) out.color = look.color;
      if (typeof look.icon === "string" && isIcon(look.icon)) out.icon = look.icon;
      if (look.kind === "vivid" || look.kind === "road") out.kind = look.kind;
      if (typeof look.iconColor === "string" && /^#[0-9a-f]{6}$/i.test(look.iconColor)) out.iconColor = look.iconColor;
      tileStyles[k as TileType] = out;
    }
  const n = (r.numbers && typeof r.numbers === "object" ? r.numbers : {}) as Record<string, unknown>;
  const numbers: NumberStyle = {
    show: typeof n.show === "boolean" ? n.show : DEFAULT_NUMBERS.show,
    size: Math.round(Math.max(NUMBER_SIZE.min, Math.min(NUMBER_SIZE.max, num(n.size, DEFAULT_NUMBERS.size)))),
    font: typeof n.font === "string" && n.font in NUMBER_FONTS ? (n.font as NumberFont) : DEFAULT_NUMBERS.font,
    pos: typeof n.pos === "string" && n.pos in NUMBER_POSITIONS ? (n.pos as NumberPosition) : DEFAULT_NUMBERS.pos,
  };
  return { version: 1, w, h, ground, height, objects, light, shadow, mist, tiles, tileStyles, numbers };
}

/** Un emoji/texto corto o una imagen pequeña subida desde el editor. */
export function isIcon(icon: string) {
  if (icon.startsWith("data:")) return /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(icon) && icon.length < 80_000;
  return icon.length > 0 && icon.length <= 16;
}

/** ¿La casilla t se pisa con una puesta en (x, y)? */
const overlaps = (t: Cell, x: number, y: number) => Math.abs(t.x - x) < TILE_SIZE && Math.abs(t.y - y) < TILE_SIZE;

/** Esquina (celda de arriba a la izquierda) de la casilla centrada lo más cerca posible del punto (px, pz). */
export function tileAnchor(l: BoardLayout, px: number, pz: number): Cell {
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max - TILE_SIZE);
  return { x: clamp(Math.round(px - TILE_SIZE / 2), l.w), y: clamp(Math.round(pz - TILE_SIZE / 2), l.h) };
}

/**
 * Pone la siguiente casilla con su esquina en (x, y), o quita la que haya ahí (las de después se renumeran).
 * mode "add" solo pone y "remove" solo quita (para arrastrar el ratón sin alternar).
 */
export function toggleTile(l: BoardLayout, x: number, y: number, mode: "toggle" | "add" | "remove" = "toggle"): BoardLayout {
  if (x < 0 || y < 0 || x + TILE_SIZE > l.w || y + TILE_SIZE > l.h) return l;
  // al quitar manda la casilla más cercana de las que se pisan con ese sitio
  let i = -1;
  let best = Infinity;
  l.tiles.forEach((t, k) => {
    const d = Math.hypot(t.x - x, t.y - y);
    if (overlaps(t, x, y) && d < best) [i, best] = [k, d];
  });
  if (i >= 0) return mode === "add" ? l : { ...l, tiles: l.tiles.filter((_, k) => k !== i) };
  if (mode === "remove" || l.tiles.length >= TILE_COUNT) return l;
  return { ...l, tiles: [...l.tiles, { x, y }] };
}

/** ¿Hay una casilla en ese sitio (esquina x, y)? */
export const tileAt = (l: BoardLayout, x: number, y: number) => l.tiles.some((t) => overlaps(t, x, y));

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
const toHex = (v: number[]) => "#" + v.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("");

/** Color del icono y del número cuando el usuario no elige uno: pintura suave en carretera; claro u oscuro en vivo. */
export function defaultInk(color: string, kind: TileKind): string {
  const rgb = [0, 1, 2].map((i) => channel(color, i));
  if (kind === "road") return toHex(rgb.map((c, i) => c * 0.5 + [242, 239, 230][i] * 0.5));
  return (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255 > 0.62 ? "#2b2140" : "#ffffff";
}

/** Color, icono y estilo con los que se pinta un tipo de casilla. `ink` es el color del icono y del número. */
export function lookOf(l: BoardLayout, type: TileType): { color: string; icon: string; kind: TileKind; ink: string; customInk: boolean } {
  const d = TILE_STYLE[type];
  const own = l.tileStyles[type];
  const color = own?.color ?? VIVID[type] ?? d.bg[0];
  const kind = own?.kind ?? (VIVID[type] ? "vivid" : "road");
  return { color, icon: own?.icon ?? iconValue(DEFAULT_ICON[type]), kind, ink: own?.iconColor ?? defaultInk(color, kind), customInk: !!own?.iconColor };
}
