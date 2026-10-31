import { BOARD, TILE_NAMES, type Tile } from "@/game/board";
import { PLAYER_COLORS, TILE_STYLE } from "@/game/tileStyle";
import { DEFAULT_ICON, iconValue } from "./icons";

// Diseño del tablero hecho en el editor (/admin/editor): un terreno de celdas pintables con altura
// y los modelos 3D colocados encima. Funciones puras: el editor y el servidor comparten este formato.

/** Tipos de suelo que se pueden pintar. `top` es la cara de arriba y `side` los lados del bloque. */
export const GROUNDS = {
  grass: { label: "Pasto", top: "#6fa13a", side: "#7a5534" },
  darkGrass: { label: "Pasto oscuro", top: "#3f5a35", side: "#3d2e25" },
  dryGrass: { label: "Pasto seco", top: "#a39a52", side: "#6e5236" },
  dirt: { label: "Tierra", top: "#8a6440", side: "#6b4a2e" },
  mud: { label: "Barro", top: "#7a5c40", side: "#5c4430" },
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
export const MAX_SIZE = 96;

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
  /** Modelo de cada ficha, una por color de jugador (null = el zombi de serie). */
  tokens: (TokenSpec | null)[];
  /** Cómo se ve el tablero en la TV: ángulo de la cámara y cuánto acerca. */
  tvView: TvView;
  /** Tamaño de los personajes zombi en el tablero (1 = el de un zombi de la decoración). */
  characterSize: number;
  /** Cómo se ve el nombre que flota sobre cada personaje (tamaño, letra, espaciado, burbuja y neón de la flecha). */
  names: NameStyle;
  /** Tamaño de lo que se dibuja encima del tablero en la TV. */
  ui: UiSize;
  /** Cómo se ve la tarjeta de usuario (cuadro del turno) de la TV: copita, zombi y letra. */
  chip: ChipStyle;
};

/** Tamaño (en %) de la tarjeta de la casilla (esquina de abajo a la derecha) y del cuadro del turno (esquina de arriba a la izquierda). 100 = el de serie. */
export type UiSize = { card: number; chip: number };
export const DEFAULT_UI: UiSize = { card: 100, chip: 100 };
export const UI_SIZE_LIMITS = { min: 50, max: 180 };
export function parseUi(raw: unknown): UiSize {
  const n = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lim = (v: unknown, d: number) => Math.round(Math.max(UI_SIZE_LIMITS.min, Math.min(UI_SIZE_LIMITS.max, num(v, d))));
  return { card: lim(n.card, DEFAULT_UI.card), chip: lim(n.chip, DEFAULT_UI.chip) };
}

/**
 * Tarjeta de usuario (`TurnChip`, arriba a la izquierda en la TV). Tamaños en %, posición de la copita en % de su tamaño (0 = el sitio de serie),
 * `outline` = grosor del borde de la copa (unidades del dibujo, 0 = sin borde), `font` de `NUMBER_FONTS`, colores en `#rrggbb`.
 */
export type ChipStyle = {
  icon: string; cupSize: number; cupX: number; cupY: number; outline: number; cupColor: string; outlineColor: string;
  zombie: number; font: NumberFont; nameSize: number; nameColor: string; labelColor: string;
};
export const DEFAULT_CHIP: ChipStyle = {
  icon: "copa", cupSize: 100, cupX: 0, cupY: 0, outline: 44, cupColor: "#ffc82e", outlineColor: "#2a0f5c",
  zombie: 100, font: "lilita", nameSize: 100, nameColor: "#ffffff", labelColor: "#bffa58",
};
export const CHIP_LIMITS = {
  cupSize: { min: 40, max: 250 },
  cupX: { min: -150, max: 250 },
  cupY: { min: -150, max: 250 },
  outline: { min: 0, max: 240 },
  zombie: { min: 60, max: 160 },
  nameSize: { min: 60, max: 150 },
};
export function parseChip(raw: unknown): ChipStyle {
  const n = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lim = (v: unknown, d: number, { min, max }: { min: number; max: number }) => Math.round(Math.max(min, Math.min(max, num(v, d))));
  const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : d);
  return {
    icon: typeof n.icon === "string" && /^[A-Za-z]{1,30}$/.test(n.icon) ? n.icon : DEFAULT_CHIP.icon,
    cupSize: lim(n.cupSize, DEFAULT_CHIP.cupSize, CHIP_LIMITS.cupSize),
    cupX: lim(n.cupX, DEFAULT_CHIP.cupX, CHIP_LIMITS.cupX),
    cupY: lim(n.cupY, DEFAULT_CHIP.cupY, CHIP_LIMITS.cupY),
    outline: lim(n.outline, DEFAULT_CHIP.outline, CHIP_LIMITS.outline),
    cupColor: hex(n.cupColor, DEFAULT_CHIP.cupColor),
    outlineColor: hex(n.outlineColor, DEFAULT_CHIP.outlineColor),
    zombie: lim(n.zombie, DEFAULT_CHIP.zombie, CHIP_LIMITS.zombie),
    font: typeof n.font === "string" && n.font in NUMBER_FONTS ? (n.font as NumberFont) : DEFAULT_CHIP.font,
    nameSize: lim(n.nameSize, DEFAULT_CHIP.nameSize, CHIP_LIMITS.nameSize),
    nameColor: hex(n.nameColor, DEFAULT_CHIP.nameColor),
    labelColor: hex(n.labelColor, DEFAULT_CHIP.labelColor),
  };
}

/**
 * Nombre sobre los personajes: `size` y `glow` y `bubble` en %, `spacing` en centésimas de em (−5 = −0,05 em), `font` de `NUMBER_FONTS`.
 * Los valores de serie son los de antes de que fuera editable.
 */
export type NameStyle = { size: number; font: NumberFont; spacing: number; bubble: number; glow: number; reach: number };
export const DEFAULT_NAMES: NameStyle = { size: 100, font: "lilita", spacing: -1, bubble: 50, glow: 100, reach: 100 };
export const NAME_LIMITS = {
  size: { min: 50, max: 200 },
  spacing: { min: -10, max: 30 },
  bubble: { min: 0, max: 100 },
  glow: { min: 0, max: 200 }, // fuerza del neón de la flecha: cuánto brilla
  reach: { min: 20, max: 300 }, // alcance del neón: hasta dónde llega la luz
};
/** Variables CSS con las que `.live-name` (globals.css) dibuja el nombre: tipo de letra, espaciado, burbuja y neón. El tamaño lo aplica quien lo coloca. */
export function nameCssVars(n: NameStyle): Record<string, string> {
  const f = NUMBER_FONTS[n.font];
  return { "--name-font": `var(${f.cssVar}), ${f.fallback}`, "--name-spacing": `${n.spacing / 100}em`, "--name-bubble": String(n.bubble / 100), "--name-glow": String(n.glow / 100), "--name-reach": String(n.reach / 100) };
}
/** Valida un `NameStyle` que llega de fuera (o un parcial): cada campo en su rango, lo demás de serie. */
export function parseNames(raw: unknown): NameStyle {
  const n = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lim = (v: unknown, d: number, { min, max }: { min: number; max: number }) => Math.round(Math.max(min, Math.min(max, num(v, d))));
  return {
    size: lim(n.size, DEFAULT_NAMES.size, NAME_LIMITS.size),
    font: typeof n.font === "string" && n.font in NUMBER_FONTS ? (n.font as NumberFont) : DEFAULT_NAMES.font,
    spacing: lim(n.spacing, DEFAULT_NAMES.spacing, NAME_LIMITS.spacing),
    bubble: lim(n.bubble, DEFAULT_NAMES.bubble, NAME_LIMITS.bubble),
    glow: lim(n.glow, DEFAULT_NAMES.glow, NAME_LIMITS.glow),
    reach: lim(n.reach, DEFAULT_NAMES.reach, NAME_LIMITS.reach),
  };
}

export const CHARACTER_SIZE = { min: 0.5, max: 4, default: 1 };

/**
 * Cámara de la TV. `az`: giro alrededor del tablero en grados (45 = desde +x +z, como la isométrica); `el`: altura en
 * grados (30 = isométrica; más = más desde arriba); `tiles`: casillas que caben a lo ancho de la pantalla cuando la
 * cámara sigue a una ficha (menos = más cerca). De serie, más desde arriba y más cerca que la isométrica (pedido
 * del usuario: "para que se note mejor el tablero").
 */
export type TvView = { az: number; el: number; tiles: number };
export const DEFAULT_TV_VIEW: TvView = { az: 45, el: 45, tiles: 6 };
export const TV_VIEW_LIMITS = { el: { min: 20, max: 80 }, tiles: { min: 3, max: 20 } };

/** Valida una vista de la TV (lo que falte o no valga, el de serie). */
export function parseTvView(raw: unknown): TvView {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const n = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) ? x : d);
  const az = ((n(v.az, DEFAULT_TV_VIEW.az) % 360) + 360) % 360;
  const el = Math.max(TV_VIEW_LIMITS.el.min, Math.min(TV_VIEW_LIMITS.el.max, n(v.el, DEFAULT_TV_VIEW.el)));
  const tiles = Math.max(TV_VIEW_LIMITS.tiles.min, Math.min(TV_VIEW_LIMITS.tiles.max, n(v.tiles, DEFAULT_TV_VIEW.tiles)));
  const r = (x: number) => Math.round(x * 100) / 100;
  return { az: r(az), el: r(el), tiles: r(tiles) };
}

/** Dirección desde el centro del tablero hacia la cámara de la TV (vector unitario). */
export function tvDirection(v: TvView): [number, number, number] {
  const az = (v.az * Math.PI) / 180;
  const el = (v.el * Math.PI) / 180;
  return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
}

export type Cell = { x: number; y: number };

/**
 * Modelo de una ficha de jugador (una por color de PLAYER_COLORS). Si falta, la TV usa el zombi de serie.
 * `base` pone una peana del color del jugador (los modelos propios no tienen camisa de color para distinguirlos).
 */
export type TokenSpec = { model: string; size: number; turn: number; base: boolean };
export const TOKEN_COUNT = PLAYER_COLORS.length;
export const TOKEN_SIZE = { min: 0.4, max: 2.5 };
export const DEFAULT_TOKEN: Omit<TokenSpec, "model"> = { size: 1.4, turn: 0, base: true };

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
  CARCEL: "#ff7a1a",
  MUERTE: "#7a2fd0",
  ESCLAVO: "#e8344a",
};

export const TILE_COUNT = BOARD.length;
export const TILE_TYPES = Object.keys(TILE_NAMES) as TileType[];
/** Tipo de juego de la casilla n (las reglas no cambian: solo dónde y cómo se ve). */
export const tileTypeOf = (n: number): TileType => BOARD[n - 1].type;

export const DEFAULT_MIST = 1;

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
    tokens: Array<TokenSpec | null>(TOKEN_COUNT).fill(null),
    tvView: DEFAULT_TV_VIEW,
    characterSize: CHARACTER_SIZE.default,
    names: DEFAULT_NAMES,
    ui: DEFAULT_UI,
    chip: DEFAULT_CHIP,
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

/** Lado del mundo por el que se amplía: "x+" es la derecha-abajo en pantalla, "z+" izquierda-abajo, "x-" izquierda-arriba, "z-" derecha-arriba. */
export type Side = "x+" | "x-" | "z+" | "z-";

/**
 * Agranda el mundo `n` casillas por un lado, sin mover nada de lo construido (las casillas y los objetos se corren si
 * el lado nuevo queda antes). El terreno nuevo continúa el del borde (mismo suelo y altura), así no queda un corte.
 */
export function expand(l: BoardLayout, side: Side, n: number): BoardLayout {
  const horizontal = side === "x+" || side === "x-";
  const room = (horizontal ? MAX_SIZE - l.w : MAX_SIZE - l.h);
  n = Math.min(Math.round(n), room);
  if (n <= 0) return l;
  const w = l.w + (horizontal ? n : 0);
  const h = l.h + (horizontal ? 0 : n);
  const ox = side === "x-" ? n : 0;
  const oy = side === "z-" ? n : 0;
  const out = newLayout(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const src = cellIndex(l, Math.min(l.w - 1, Math.max(0, x - ox)), Math.min(l.h - 1, Math.max(0, y - oy)));
      out.ground[y * w + x] = l.ground[src];
      out.height[y * w + x] = l.height[src];
    }
  return {
    ...l,
    w,
    h,
    ground: out.ground,
    height: out.height,
    tiles: l.tiles.map((t) => ({ x: t.x + ox, y: t.y + oy })),
    objects: l.objects.map((o) => ({ ...o, x: o.x + ox, z: o.z + oy })),
  };
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
  return { ...out, light: l.light, shadow: l.shadow, mist: l.mist, tileStyles: l.tileStyles, numbers: l.numbers, tokens: l.tokens, tvView: l.tvView, characterSize: l.characterSize, names: l.names, ui: l.ui, tiles: l.tiles.filter((t) => t.x + TILE_SIZE <= w && t.y + TILE_SIZE <= h), objects: l.objects.filter((o) => o.x >= 0 && o.z >= 0 && o.x <= w && o.z <= h) };
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
  const characterSize = Math.round(Math.max(CHARACTER_SIZE.min, Math.min(CHARACTER_SIZE.max, num(r.characterSize, CHARACTER_SIZE.default))) * 100) / 100;
  const tokens: (TokenSpec | null)[] = Array.from({ length: TOKEN_COUNT }, (_, i) => {
    const t = (Array.isArray(r.tokens) ? r.tokens[i] : null) as Record<string, unknown> | null;
    if (!t || typeof t !== "object" || typeof t.model !== "string" || !/^[\w-]+\/[\w.-]+$/.test(t.model)) return null;
    return {
      model: t.model,
      size: Math.max(TOKEN_SIZE.min, Math.min(TOKEN_SIZE.max, num(t.size, DEFAULT_TOKEN.size))),
      turn: ((Math.round(num(t.turn, 0)) % 360) + 360) % 360,
      base: typeof t.base === "boolean" ? t.base : DEFAULT_TOKEN.base,
    };
  });
  return { version: 1, w, h, ground, height, objects, light, shadow, mist, tiles, tileStyles, numbers, tokens, tvView: parseTvView(r.tvView), characterSize, names: parseNames(r.names), ui: parseUi(r.ui), chip: parseChip(r.chip) };
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
