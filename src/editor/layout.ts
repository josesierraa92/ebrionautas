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
};

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
};

export function newLayout(w = 32, h = 24): BoardLayout {
  return {
    version: 1,
    w,
    h,
    ground: Array<GroundId>(w * h).fill("grass"),
    height: Array<number>(w * h).fill(2),
    objects: [],
    light: "dia",
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
  return { ...out, light: l.light, objects: l.objects.filter((o) => o.x >= 0 && o.z >= 0 && o.x <= w && o.z <= h) };
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
  }
  const light = typeof r.light === "string" && r.light in LIGHTS ? (r.light as LightId) : "dia";
  return { version: 1, w, h, ground, height, objects, light };
}
