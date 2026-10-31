// Las 62 casillas del tablero (reglas del "Nuevo Ocalimocho", tema "Muertos de Sed":
// los muertos salen una noche de fiesta y deben volver a su tumba antes del amanecer).
// Ver docs/plan-ebrionautas.md §0.4 y §1. Los textos marcados con TODO están
// pendientes de validar contra el tablero físico.

export type Tile =
  | { n: number; type: "SALIDA" }
  | { n: number; type: "META" }
  | { n: number; type: "POSADA" }
  | { n: number; type: "A_BEBER"; amount: number }
  | { n: number; type: "DUELO"; amount: number }
  | { n: number; type: "OCA"; next: number | null }
  | { n: number; type: "REGLA" }
  | { n: number; type: "CULTURAL" }
  | { n: number; type: "YO_NUNCA" }
  | { n: number; type: "RONDA" }
  | { n: number; type: "REFLEJO" }
  | { n: number; type: "HIPNOSIS" }
  | { n: number; type: "CARCEL" }
  | { n: number; type: "MUERTE" }
  | { n: number; type: "PATINAZO"; drinks: number; backTo: number }
  | { n: number; type: "RASGO" }
  | { n: number; type: "ESCLAVO" }
  | { n: number; type: "RETO"; nickname?: boolean; title?: string };

/** Texto de la casilla «Nuevo apodo» (`{apodo}` es el que sale al azar). */
export const NICKNAME_TEXT = "Desde ahora en esta ronda tu nombre es {apodo}. Si alguien se equivoca y te llama de otra forma, bebe (se lo suma el celular con «+ Trago»).";

/** Tropiezo de lápida: siempre 2 vasos (también para una decisión que ya estuviera guardada con otro número). */
export const PATINAZO_DRINKS = 2;

export const TILE_NAMES: Record<Tile["type"], string> = {
  SALIDA: "Medianoche",
  META: "Tu Tumba",
  POSADA: "La Capilla",
  A_BEBER: "Trago de regalo",
  DUELO: "Duelo de calaveras",
  OCA: "El Murciélago",
  REGLA: "Ley del Más Allá",
  CULTURAL: "La Ouija",
  YO_NUNCA: "Yo nunca",
  RONDA: "Reto de ronda",
  REFLEJO: "Muerte Súbita",
  HIPNOSIS: "Poseído",
  CARCEL: "Purgatorio",
  MUERTE: "La Fosa",
  PATINAZO: "Tropiezo de lápida",
  RASGO: "Juicio de los vivos",
  ESCLAVO: "Pacto de Sangre",
  RETO: "Reto del Más Allá",
};

const OCAS = [8, 18, 28, 38, 48, 58];

export const BOARD: Tile[] = [
  { n: 1, type: "SALIDA" },
  { n: 2, type: "RASGO" },
  { n: 3, type: "RASGO" },
  { n: 4, type: "POSADA" },
  { n: 5, type: "RASGO" },
  { n: 6, type: "A_BEBER", amount: 1 },
  { n: 7, type: "YO_NUNCA" },
  { n: 8, type: "OCA", next: 18 },
  { n: 9, type: "REFLEJO" },
  { n: 10, type: "REGLA" },
  { n: 11, type: "RASGO" },
  { n: 12, type: "RASGO" },
  { n: 13, type: "CULTURAL" },
  { n: 14, type: "RETO", title: "Nuevo apodo", nickname: true },
  { n: 15, type: "RETO" },
  { n: 16, type: "RETO" },
  { n: 17, type: "HIPNOSIS" },
  { n: 18, type: "OCA", next: 28 },
  { n: 19, type: "DUELO", amount: 2 },
  { n: 20, type: "POSADA" },
  // TODO validar texto exacto de la casilla 21
  { n: 21, type: "RASGO" },
  { n: 22, type: "RETO" },
  { n: 23, type: "YO_NUNCA" },
  // TODO validar texto exacto de la casilla 24
  { n: 24, type: "ESCLAVO" },
  { n: 25, type: "RONDA" },
  { n: 26, type: "CARCEL" },
  { n: 27, type: "RETO" },
  { n: 28, type: "OCA", next: 38 },
  { n: 29, type: "YO_NUNCA" },
  { n: 30, type: "A_BEBER", amount: 4 },
  { n: 31, type: "RASGO" },
  // TODO validar texto exacto de la casilla 32
  { n: 32, type: "RASGO" },
  { n: 33, type: "CULTURAL" },
  // TODO validar texto exacto de la casilla 34
  { n: 34, type: "RETO" },
  { n: 35, type: "REFLEJO" },
  { n: 36, type: "HIPNOSIS" },
  { n: 37, type: "YO_NUNCA" },
  { n: 38, type: "OCA", next: 48 },
  { n: 39, type: "CULTURAL" },
  { n: 40, type: "RETO" },
  { n: 41, type: "REGLA" },
  { n: 42, type: "RETO" },
  { n: 43, type: "PATINAZO", drinks: 2, backTo: 12 },
  // TODO validar texto exacto de la casilla 44
  { n: 44, type: "RETO" },
  { n: 45, type: "CARCEL" },
  { n: 46, type: "RASGO" },
  { n: 47, type: "DUELO", amount: 5 },
  { n: 48, type: "OCA", next: 58 },
  { n: 49, type: "RETO" },
  { n: 50, type: "RETO" },
  { n: 51, type: "RASGO" },
  { n: 52, type: "RONDA" },
  // TODO validar texto exacto de la casilla 53
  { n: 53, type: "RETO" },
  { n: 54, type: "RASGO" },
  { n: 55, type: "POSADA" },
  // TODO validar bebida y destino de la casilla 56
  { n: 56, type: "PATINAZO", drinks: 2, backTo: 31 },
  { n: 57, type: "HIPNOSIS" },
  { n: 58, type: "OCA", next: null },
  { n: 59, type: "REFLEJO" },
  { n: 60, type: "MUERTE" },
  { n: 61, type: "RETO" },
  { n: 62, type: "META" },
];

export function getTile(n: number): Tile {
  const tile = BOARD[n - 1];
  if (!tile || tile.n !== n) throw new Error(`Casilla inválida: ${n}`);
  return tile;
}

export function nextOca(n: number): number | null {
  return OCAS.find((o) => o > n) ?? null;
}
