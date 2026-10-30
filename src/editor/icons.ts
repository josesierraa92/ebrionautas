// Iconos de las casillas del juego: siluetas de un solo tono, con temática de terror y fáciles de leer a distancia.
// Cada icono es una lista de operaciones sobre un lienzo de 64×64: "f" rellena una forma y "c" recorta un hueco
// (se aplican en orden, así se puede recortar y volver a rellenar dentro, como en el ojo).
import type { TileType } from "./layout";

type Op = ["f" | "c", string];

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
/** Rectángulo con las esquinas redondeadas. */
const rect = (x: number, y: number, w: number, h: number, r = 0) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;

const CROSS = "M29.5 20h5v7h7v5h-7v14h-5V32h-7v-5h7z";

export const ICONS = {
  /** Medianoche (salida): luna creciente y una estrella. */
  moon: [
    ["f", "M37.42 9.18A24 24 0 1 0 51.12 43.4A19 19 0 1 1 37.42 9.18Z"],
    ["f", "M50 8l2.4 5.6L58 16l-5.6 2.4L50 24l-2.4-5.6L42 16l5.6-2.4z"],
  ],
  /** Tu Tumba (meta): lápida con cruz. */
  tomb: [
    ["f", "M14 56V28a18 18 0 0 1 36 0v28z"],
    ["f", rect(8, 54, 48, 6, 3)],
    ["c", CROSS],
  ],
  /** Lápida agrietada (tropiezo con la lápida). */
  crack: [
    ["f", "M14 56V28a18 18 0 0 1 36 0v28z"],
    ["f", rect(8, 54, 48, 6, 3)],
    ["c", "M30 10l5 9-7 7 8 8-6 8 4 10h-5l-4-10 6-8-8-8 7-7-4-9z"],
  ],
  /** La Capilla (posada): iglesita con cruz y puerta. */
  chapel: [
    ["f", "M29.5 3h5v5h5v4.5h-5v5h-5v-5h-5V8h5z"],
    ["f", "M32 20L52 36v22H12V36z"],
    ["c", "M26 58V45a6 6 0 0 1 12 0v13z"],
  ],
  /** Ronda de mezcal: botella con etiqueta. */
  bottle: [
    ["f", "M27 4h10v12l8 8v32a4 4 0 0 1-4 4H23a4 4 0 0 1-4-4V24l8-8z"],
    ["c", rect(24, 32, 16, 16, 3)],
  ],
  /** Duelo de calaveras: calavera. */
  skull: [
    ["f", "M32 5C18 5 9 14 9 27c0 8 4 14 10 17v10a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V44c6-3 10-9 10-17C55 14 46 5 32 5z"],
    ["c", circle(22.5, 29, 6.5)],
    ["c", circle(41.5, 29, 6.5)],
    ["c", "M32 36l-4.5 8h9z"],
    ["c", "M26 49v7h2.5v-7z"],
    ["c", "M35.5 49v7H38v-7z"],
  ],
  /** El Murciélago (oca): murciélago con las alas abiertas. */
  bat: [
    [
      "f",
      "M32 18L35 11L36 20C42 14 52 14 61 21C57 23 55 27 56 33C52 30 48 31 46 35C44 32 40 32 38 37L36 41C35 43 33.5 43.5 32 43.5C30.5 43.5 29 43 28 41L26 37C24 32 20 32 18 35C16 31 12 30 8 33C9 27 7 23 3 21C12 14 22 14 28 20L29 11Z",
    ],
    ["c", circle(29, 25, 1.8)],
    ["c", circle(35, 25, 1.8)],
  ],
  /** Panteón en Niebla (laberinto): nube y rachas de niebla. */
  fog: [
    ["f", circle(20, 34, 9)],
    ["f", circle(32, 26, 13)],
    ["f", circle(46, 33, 10)],
    ["f", rect(20, 34, 26, 9)],
    ["f", rect(8, 49, 30, 5, 2.5)],
    ["f", rect(26, 49 + 7, 30, 5, 2.5)],
  ],
  /** Ley del Más Allá (regla): balanza. */
  scales: [
    ["f", rect(30, 8, 4, 44, 2)],
    ["f", rect(18, 52, 28, 6, 3)],
    ["f", rect(8, 14, 48, 4, 2)],
    ["f", "M13 18L3 36h20z"],
    ["f", "M2 36h22a11 8 0 0 1-22 0z"],
    ["f", "M51 18L41 36h20z"],
    ["f", "M40 36h22a11 8 0 0 1-22 0z"],
    ["f", circle(32, 11, 5)],
  ],
  /** La Ouija (cultural): la plancheta. */
  planchette: [
    ["f", "M32 5C23 5 9 28 9 44c0 10 10 15 23 15s23-5 23-15C55 28 41 5 32 5z"],
    ["c", circle(32, 38, 11)],
    ["f", circle(32, 38, 3.5)],
  ],
  /** Poseído (hipnosis): fantasma. */
  ghost: [
    ["f", "M12 58V30a20 22 0 0 1 40 0v28l-7-6-6.5 6-6.5-6-6.5 6-6.5-6z"],
    ["c", circle(25, 30, 4.5)],
    ["c", circle(39, 30, 4.5)],
    ["c", "M32 38.5a3.2 4 0 1 0 0.01 0z"],
  ],
  /** Purgatorio (cárcel): llama. */
  flame: [
    ["f", "M32 3C34 16 48 22 48 38a16 16 0 0 1-32 0c0-8 4-12 8-16 0 6 4 8 6 8-2-8-2-18 2-27z"],
    ["c", "M32 58a8 8 0 0 1-8-8c0-6 6-8 8-14 2 6 8 8 8 14a8 8 0 0 1-8 8z"],
  ],
  /** La Fosa (muerte): ataúd con cruz. */
  coffin: [
    ["f", "M24 3h16l12 17-8 40H20L12 20z"],
    ["c", "M29.5 20h5v7h6v5h-6v14h-5V32h-6v-5h6z"],
  ],
  /** Juicio de los vivos (posición / rasgo): ojo. */
  eye: [
    ["f", "M3 32C13 15 51 15 61 32C51 49 13 49 3 32z"],
    ["c", circle(32, 32, 11)],
    ["f", circle(32, 32, 5.5)],
  ],
  /** Pacto de Sangre (esclavo): gota. */
  drop: [
    ["f", "M32 4C40 18 51 28 51 41a19 19 0 0 1-38 0C13 28 24 18 32 4z"],
    ["c", "M22 41c0 6 3 10 8 12-6 0-12-4-8-12z"],
  ],
  /** Yo nunca: una mano levantada (palma abierta). */
  hand: [
    ["f", rect(15, 28, 34, 30, 11)],
    ["f", rect(15, 11, 7, 30, 3.5)],
    ["f", rect(24, 5, 7, 36, 3.5)],
    ["f", rect(33, 5, 7, 36, 3.5)],
    ["f", rect(42, 11, 7, 30, 3.5)],
    ["f", "M18 46L5 36a3.6 3.6 0 0 1 5-5.2L24 41z"],
  ],
  /** Muerte Súbita: cronómetro. */
  stopwatch: [
    ["f", rect(26, 4, 12, 6, 3)],
    ["f", rect(30, 9, 4, 8, 1)],
    ["f", circle(32, 37, 22)],
    ["c", circle(32, 37, 16)],
    ["f", "M30 37V24h4v10l8 6-2.4 3.2z"],
    ["f", "M47 14l4 4-4 4-4-4z"],
  ],
  /** Reto de ronda: reloj de arena. */
  hourglass: [
    ["f", rect(12, 6, 40, 6, 3)],
    ["f", rect(12, 52, 40, 6, 3)],
    ["f", "M16 12h32c0 14-10 16-14 20 4 4 14 6 14 20H16c0-14 10-16 14-20-4-4-14-6-14-20z"],
    ["c", "M24 14h16c-1 7-6 9-8 12-2-3-7-5-8-12z"],
  ],
  /** Reto del Más Allá: globo de diálogo con admiración. */
  speech: [
    ["f", "M12 7h40a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H31L18 57V45h-6a6 6 0 0 1-6-6V13a6 6 0 0 1 6-6z"],
    ["c", rect(29, 15, 6, 17, 3)],
    ["c", circle(32, 38, 3.4)],
  ],
} satisfies Record<string, Op[]>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export const ICON_LABELS: Record<IconName, string> = {
  moon: "Luna",
  tomb: "Tumba",
  crack: "Lápida rota",
  chapel: "Capilla",
  bottle: "Botella",
  skull: "Calavera",
  bat: "Murciélago",
  fog: "Niebla",
  scales: "Balanza",
  planchette: "Ouija",
  ghost: "Fantasma",
  flame: "Llama",
  coffin: "Ataúd",
  eye: "Ojo",
  drop: "Sangre",
  speech: "Reto",
  hand: "Yo nunca",
  hourglass: "Ronda",
  stopwatch: "Cronómetro",
};

/** Icono de serie de cada tipo de casilla. */
export const DEFAULT_ICON: Record<TileType, IconName> = {
  SALIDA: "moon",
  META: "tomb",
  POSADA: "chapel",
  A_BEBER: "bottle",
  DUELO: "skull",
  OCA: "bat",
  LABERINTO: "fog",
  REGLA: "scales",
  CULTURAL: "planchette",
  YO_NUNCA: "hand",
  RONDA: "hourglass",
  REFLEJO: "stopwatch",
  HIPNOSIS: "ghost",
  CARCEL: "flame",
  MUERTE: "coffin",
  PATINAZO: "crack",
  RASGO: "eye",
  ESCLAVO: "drop",
  RETO: "speech",
};

/** Los iconos propios se guardan como "i:<nombre>". */
export const iconValue = (name: IconName) => `i:${name}`;
export const builtinIcon = (icon: string): IconName | null => (icon.startsWith("i:") && icon.slice(2) in ICONS ? (icon.slice(2) as IconName) : null);

/** Dibuja un icono centrado en (0, 0) dentro de un cuadrado de `size` píxeles, con el color actual de relleno. */
export function drawIcon(ctx: CanvasRenderingContext2D, name: IconName, size: number) {
  ctx.save();
  ctx.scale(size / 64, size / 64);
  ctx.translate(-32, -32);
  for (const [op, d] of ICONS[name]) {
    ctx.globalCompositeOperation = op === "f" ? "source-over" : "destination-out";
    ctx.fill(new Path2D(d));
  }
  ctx.restore();
}

const masks = new Map<string, string>();
/**
 * Imagen blanca del icono (para pintarlo de cualquier color con una máscara CSS en la interfaz). `px` es el lado: 96
 * para iconos pequeños; los grandes (títulos de la TV) piden más para que no se vean borrosos.
 */
export function iconMaskUrl(name: IconName, px = 96): string {
  const key = `${name}@${px}`;
  let url = masks.get(key);
  if (!url) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = px;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.translate(px / 2, px / 2);
    drawIcon(ctx, name, px - 4);
    url = canvas.toDataURL("image/png");
    masks.set(key, url);
  }
  return url;
}
