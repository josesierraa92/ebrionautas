// Las 62 casillas del tablero (reglas del "Nuevo Ocalimocho", tema galáctico).
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
  | { n: number; type: "HIPNOSIS" }
  | { n: number; type: "CARCEL" }
  | { n: number; type: "MUERTE" }
  | { n: number; type: "PATINAZO"; drinks: number; backTo: number }
  | { n: number; type: "POSICION"; who: "detras" | "delante"; drinks: number; title: string }
  | { n: number; type: "RASGO"; traits: Trait[]; drinks: number; title: string }
  | { n: number; type: "RETO"; title: string; text: string };

export const TILE_NAMES: Record<Tile["type"], string> = {
  SALIDA: "Plataforma de despegue",
  META: "Planeta Tierra – La Fiesta Definitiva",
  POSADA: "Estación de servicio Abstemia",
  A_BEBER: "Ronda de combustible",
  DUELO: "Duelo de dados láser",
  OCA: "Oca Espacial",
  LABERINTO: "Cinturón de asteroides",
  REGLA: "Ley del Consejo Galáctico",
  CULTURAL: "Examen de Humanología",
  HIPNOSIS: "Abducción mental",
  CARCEL: "Calabozo de la Policía Intergaláctica",
  MUERTE: "Agujero negro",
  PATINAZO: "Resbalón en los anillos de Saturno",
  POSICION: "Estudio de especímenes humanos",
  RASGO: "Estudio de especímenes humanos",
  RETO: "Reto humano",
};

const OCAS = [8, 18, 28, 38, 48, 58];

export const BOARD: Tile[] = [
  { n: 1, type: "SALIDA" },
  { n: 2, type: "RASGO", traits: ["hombre"], drinks: 1, title: "Machos" },
  { n: 3, type: "RASGO", traits: ["gafas"], drinks: 1, title: "Cegatos" },
  { n: 4, type: "POSADA" },
  { n: 5, type: "RASGO", traits: ["melena_gomina"], drinks: 1, title: "Travoltas" },
  { n: 6, type: "A_BEBER", amount: 1 },
  { n: 7, type: "DUELO", amount: 1 },
  { n: 8, type: "OCA", next: 18 },
  { n: 9, type: "LABERINTO" },
  { n: 10, type: "REGLA" },
  { n: 11, type: "RASGO", traits: ["mujer"], drinks: 2, title: "Hembras" },
  { n: 12, type: "POSICION", who: "detras", drinks: 1, title: "Pa' los de atrás" },
  { n: 13, type: "CULTURAL" },
  { n: 14, type: "A_BEBER", amount: 2 },
  { n: 15, type: "RETO", title: "Cómicos", text: "Cuenta un chiste. Si a nadie le hace gracia, bebes 2 vasos." },
  { n: 16, type: "RETO", title: "Pastosos", text: "Quien lleve mucho dinero en la cartera bebe por cada billete de más." },
  { n: 17, type: "HIPNOSIS" },
  { n: 18, type: "OCA", next: 28 },
  { n: 19, type: "DUELO", amount: 2 },
  { n: 20, type: "POSADA" },
  // TODO validar texto exacto de la casilla 21
  { n: 21, type: "RASGO", traits: ["anio_impar"], drinks: 1, title: "Impares" },
  { n: 22, type: "A_BEBER", amount: 3 },
  { n: 23, type: "REGLA" },
  // TODO validar texto exacto de la casilla 24
  { n: 24, type: "RETO", title: "Esclavos", text: "Escoge un esclavo: beberá cada vez que tú bebas hasta que alguien lo libere." },
  { n: 25, type: "CULTURAL" },
  { n: 26, type: "CARCEL" },
  { n: 27, type: "RETO", title: "Meones", text: "Quien haya ido al baño bebe 2 vasos." },
  { n: 28, type: "OCA", next: 38 },
  { n: 29, type: "DUELO", amount: 3 },
  { n: 30, type: "A_BEBER", amount: 4 },
  { n: 31, type: "POSICION", who: "delante", drinks: 1, title: "Pa' los de alante" },
  // TODO validar texto exacto de la casilla 32
  { n: 32, type: "RASGO", traits: ["anio_par"], drinks: 2, title: "Pares" },
  { n: 33, type: "CULTURAL" },
  // TODO validar texto exacto de la casilla 34
  { n: 34, type: "RETO", title: "Guerra de sexos", text: "Reto por equipos: el equipo perdedor bebe." },
  { n: 35, type: "LABERINTO" },
  { n: 36, type: "HIPNOSIS" },
  { n: 37, type: "DUELO", amount: 4 },
  { n: 38, type: "OCA", next: 48 },
  { n: 39, type: "CULTURAL" },
  { n: 40, type: "RETO", title: "Corleone", text: "Quien tenga un pariente en la mesa bebe 3 vasos." },
  { n: 41, type: "REGLA" },
  { n: 42, type: "RETO", title: "Tardones", text: "Quien no tenga el vaso vacío se lo termina y bebe otro." },
  { n: 43, type: "PATINAZO", drinks: 4, backTo: 12 },
  // TODO validar texto exacto de la casilla 44
  { n: 44, type: "RETO", title: "Descuido", text: "Quien no lleve condón encima bebe 1 vaso." },
  { n: 45, type: "CARCEL" },
  { n: 46, type: "RASGO", traits: ["tatuaje_piercing"], drinks: 2, title: "Tatuados" },
  { n: 47, type: "DUELO", amount: 5 },
  { n: 48, type: "OCA", next: 58 },
  { n: 49, type: "A_BEBER", amount: 5 },
  { n: 50, type: "RETO", title: "Escoceses", text: "Si llevas ropa de cuadros, bebe 1 chupito." },
  { n: 51, type: "RASGO", traits: ["deportista"], drinks: 2, title: "Musculitos" },
  { n: 52, type: "CULTURAL" },
  // TODO validar texto exacto de la casilla 53
  { n: 53, type: "RETO", title: "Sedientos", text: "Te bebes lo que les queda en el vaso a tus compañeros." },
  { n: 54, type: "RASGO", traits: ["mascota"], drinks: 1, title: "Zoofílicos" },
  { n: 55, type: "POSADA" },
  // TODO validar bebida y destino de la casilla 56
  { n: 56, type: "PATINAZO", drinks: 3, backTo: 31 },
  { n: 57, type: "HIPNOSIS" },
  { n: 58, type: "OCA", next: null },
  { n: 59, type: "A_BEBER", amount: 6 },
  { n: 60, type: "MUERTE" },
  { n: 61, type: "RETO", title: "Lenguados", text: "Recita un trabalenguas. Quien no lo repita bien bebe 2 vasos." },
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
