// Las 62 casillas del tablero (reglas del "Nuevo Ocalimocho", tema "Muertos de Sed":
// los muertos salen una noche de fiesta y deben volver a su tumba antes del amanecer).
// Ver docs/plan-ebrionautas.md §0.4 y §1. Los textos marcados con TODO están
// pendientes de validar contra el tablero físico.

export type Trait =
  | "hombre"
  | "mujer"
  | "gafas"
  | "melena_gomina"
  | "tatuaje_piercing"
  | "mascota"
  | "deportista"
  | "anio_par"
  | "anio_impar";

export type Tile =
  | { n: number; type: "SALIDA" }
  | { n: number; type: "META" }
  | { n: number; type: "POSADA" }
  | { n: number; type: "A_BEBER"; amount: number }
  | { n: number; type: "DUELO"; amount: number }
  | { n: number; type: "OCA"; next: number | null }
  | { n: number; type: "LABERINTO" }
  | { n: number; type: "REGLA" }
  | { n: number; type: "CULTURAL" }
  | { n: number; type: "YO_NUNCA" }
  | { n: number; type: "HIPNOSIS" }
  | { n: number; type: "CARCEL" }
  | { n: number; type: "MUERTE" }
  | { n: number; type: "PATINAZO"; drinks: number; backTo: number }
  | { n: number; type: "POSICION"; who: "detras" | "delante"; drinks: number; title: string }
  | { n: number; type: "RASGO"; traits: Trait[]; drinks: number; title: string }
  | { n: number; type: "ESCLAVO" }
  | { n: number; type: "RETO"; title: string; text: string; drinks: number; twister?: boolean; nickname?: boolean };

export const TRAIT_LABELS: Record<Trait, string> = {
  hombre: "los hombres",
  mujer: "las mujeres",
  gafas: "quienes lleven gafas o lentillas",
  melena_gomina: "quienes lleven melena o el pelo con gomina",
  tatuaje_piercing: "quienes lleven tatuaje o piercing",
  mascota: "quienes tengan mascota",
  deportista: "quienes vayan al gimnasio o hagan deporte",
  anio_par: "los nacidos en año par",
  anio_impar: "los nacidos en año impar",
};

/** Tropiezo de lápida: siempre 2 vasos (también para una decisión que ya estuviera guardada con otro número). */
export const PATINAZO_DRINKS = 2;

export const TILE_NAMES: Record<Tile["type"], string> = {
  SALIDA: "Medianoche",
  META: "Tu Tumba",
  POSADA: "La Capilla",
  A_BEBER: "Trago de regalo",
  DUELO: "Duelo de calaveras",
  OCA: "El Murciélago",
  LABERINTO: "Panteón en Niebla",
  REGLA: "Ley del Más Allá",
  CULTURAL: "La Ouija",
  YO_NUNCA: "Yo nunca",
  HIPNOSIS: "Poseído",
  CARCEL: "Purgatorio",
  MUERTE: "La Fosa",
  PATINAZO: "Tropiezo de lápida",
  POSICION: "Juicio de los vivos",
  RASGO: "Juicio de los vivos",
  ESCLAVO: "Pacto de Sangre",
  RETO: "Reto del Más Allá",
};

const OCAS = [8, 18, 28, 38, 48, 58];

export const BOARD: Tile[] = [
  { n: 1, type: "SALIDA" },
  { n: 2, type: "RASGO", traits: ["hombre"], drinks: 1, title: "Machos" },
  { n: 3, type: "RASGO", traits: ["gafas"], drinks: 1, title: "Cegatos" },
  { n: 4, type: "POSADA" },
  { n: 5, type: "RASGO", traits: ["melena_gomina"], drinks: 1, title: "Travoltas" },
  { n: 6, type: "A_BEBER", amount: 1 },
  { n: 7, type: "YO_NUNCA" },
  { n: 8, type: "OCA", next: 18 },
  { n: 9, type: "LABERINTO" },
  { n: 10, type: "REGLA" },
  { n: 11, type: "RASGO", traits: ["mujer"], drinks: 2, title: "Hembras" },
  { n: 12, type: "POSICION", who: "detras", drinks: 1, title: "Pa' los de atrás" },
  { n: 13, type: "CULTURAL" },
  { n: 14, type: "RETO", title: "Nuevo apodo", text: "Desde ahora en esta ronda tu nombre es {apodo}. Si alguien se equivoca y te llama de otra forma, toma 1 vaso (se lo suma el celular con «+ Trago»).", drinks: 1, nickname: true },
  { n: 15, type: "RETO", title: "Cómicos", text: "Cuenta un chiste. Si a nadie le hace gracia, bebes 2 vasos.", drinks: 2 },
  { n: 16, type: "RETO", title: "Pastosos", text: "Quien lleve mucho dinero en la cartera bebe por cada billete de más.", drinks: 1 },
  { n: 17, type: "HIPNOSIS" },
  { n: 18, type: "OCA", next: 28 },
  { n: 19, type: "DUELO", amount: 2 },
  { n: 20, type: "POSADA" },
  // TODO validar texto exacto de la casilla 21
  { n: 21, type: "RASGO", traits: ["anio_impar"], drinks: 1, title: "Impares" },
  { n: 22, type: "RETO", title: "Borrachín", text: "Todos los jugadores toman un trago, excepto el más ebrio (entre todos lo eligen).", drinks: 1 },
  { n: 23, type: "REGLA" },
  // TODO validar texto exacto de la casilla 24
  { n: 24, type: "ESCLAVO" },
  { n: 25, type: "CULTURAL" },
  { n: 26, type: "CARCEL" },
  { n: 27, type: "RETO", title: "Meones", text: "Quien haya ido al baño bebe 2 vasos.", drinks: 2 },
  { n: 28, type: "OCA", next: 38 },
  { n: 29, type: "YO_NUNCA" },
  { n: 30, type: "A_BEBER", amount: 4 },
  { n: 31, type: "POSICION", who: "delante", drinks: 1, title: "Pa' los de alante" },
  // TODO validar texto exacto de la casilla 32
  { n: 32, type: "RASGO", traits: ["anio_par"], drinks: 2, title: "Pares" },
  { n: 33, type: "CULTURAL" },
  // TODO validar texto exacto de la casilla 34
  { n: 34, type: "RETO", title: "Guerra de sexos", text: "Reto por equipos: el equipo perdedor bebe.", drinks: 1 },
  { n: 35, type: "LABERINTO" },
  { n: 36, type: "HIPNOSIS" },
  { n: 37, type: "YO_NUNCA" },
  { n: 38, type: "OCA", next: 48 },
  { n: 39, type: "CULTURAL" },
  { n: 40, type: "RETO", title: "Corleone", text: "Quien tenga un pariente en la mesa bebe 3 vasos.", drinks: 3 },
  { n: 41, type: "REGLA" },
  { n: 42, type: "RETO", title: "Tardones", text: "Quien no tenga el vaso vacío se lo termina y bebe otro.", drinks: 1 },
  { n: 43, type: "PATINAZO", drinks: 2, backTo: 12 },
  // TODO validar texto exacto de la casilla 44
  { n: 44, type: "RETO", title: "Descuido", text: "Quien no lleve condón encima bebe 1 vaso.", drinks: 1 },
  { n: 45, type: "CARCEL" },
  { n: 46, type: "RASGO", traits: ["tatuaje_piercing"], drinks: 2, title: "Tatuados" },
  { n: 47, type: "DUELO", amount: 5 },
  { n: 48, type: "OCA", next: 58 },
  { n: 49, type: "RETO", title: "Muero de sed", text: "Pon un poco de licor en la mano del jugador de la derecha y bébelo como si fueras un perrito.", drinks: 1 },
  { n: 50, type: "RETO", title: "Escoceses", text: "Si llevas ropa de cuadros, bebe 1 chupito.", drinks: 1 },
  { n: 51, type: "RASGO", traits: ["deportista"], drinks: 2, title: "Musculitos" },
  { n: 52, type: "CULTURAL" },
  // TODO validar texto exacto de la casilla 53
  { n: 53, type: "RETO", title: "Sedientos", text: "Te bebes lo que les queda en el vaso a tus compañeros.", drinks: 1 },
  { n: 54, type: "RASGO", traits: ["mascota"], drinks: 1, title: "Zoofílicos" },
  { n: 55, type: "POSADA" },
  // TODO validar bebida y destino de la casilla 56
  { n: 56, type: "PATINAZO", drinks: 2, backTo: 31 },
  { n: 57, type: "HIPNOSIS" },
  { n: 58, type: "OCA", next: null },
  { n: 59, type: "A_BEBER", amount: 6 },
  { n: 60, type: "MUERTE" },
  { n: 61, type: "RETO", title: "Lenguados", text: "Recita un trabalenguas. Quien no lo repita bien bebe 2 vasos.", drinks: 2, twister: true },
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
