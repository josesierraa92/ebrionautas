// Decoración del tablero (coordenadas de suelo, ver isoPath.ts). La comparten el render 3D
// (scripts/board3d) y la TV. Sigue las reglas de .claude/skills/diseno-tablero: zonas, grupos con tema,
// ritmo y simetría; nada encima del camino, nada tapando casillas, nada fuera de la isla (decor.test.ts).
//
// Estética de terror / postapocalíptica: un panteón abandonado de noche, con niebla. Zonas del recorrido
// (ver ROUTE en isoPath.ts):
// - Delante, entre el primer tramo y el segundo: la hoguera de los supervivientes, con ataúdes y escombros.
// - En el centro, entre el segundo y el tercero: la fosa común (ataúdes, lápidas rotas).
// - Entre el tercero y el último: la hilera de tumbas con velas.
// - Marco: árboles muertos y muros en ruinas detrás y a la izquierda, la cripta detrás de la meta;
//   a la derecha, solo cosas bajas; delante nada (cualquier cosa ahí tapa el primer tramo).

export type DecoKind =
  | "deadTree" // árbol muerto, sin hojas
  | "lantern" // farol
  | "crypt" // cripta grande (detrás de la meta)
  | "wall" // trozo de muro de piedra en ruinas
  | "tombstone"
  | "brokenTomb" // lápida partida con escombros
  | "cross"
  | "candles"
  | "fire" // brasero con fuego
  | "coffin" // ataúd viejo
  | "debris" // escombros
  | "rocks"
  | "stump" // tocón de árbol
  | "grave" // tumba de tierra con cruz
  | "sign"; // letrero "PANTEÓN" en la salida

export type Deco = { gx: number; gy: number; kind: DecoKind; turn?: number };

/** Alto de cada objeto en casillas (tabla de escala de la skill); el test lo usa para saber qué tapa. */
export const HEIGHT: Record<DecoKind, number> = {
  deadTree: 2.5,
  lantern: 1.25,
  crypt: 1.5,
  wall: 0.6,
  tombstone: 0.5,
  brokenTomb: 0.35,
  cross: 0.5,
  candles: 0.32,
  fire: 0.55,
  coffin: 0.22,
  debris: 0.18,
  rocks: 0.45,
  stump: 0.45,
  grave: 0.5,
  sign: 0.75,
};

/** Radio que ocupa en el suelo (para no pisar casillas ni solaparse). */
export const RADIUS: Partial<Record<DecoKind, number>> = { crypt: 0.9, wall: 0.45 };

const at = (kind: DecoKind, list: [number, number][], turn?: number): Deco[] => list.map(([gx, gy]) => ({ gx, gy, kind, turn }));

export const DECOR: Deco[] = [
  // --- La hoguera de los supervivientes (delante) -----------------------------------------------------
  { gx: 7.4, gy: 8.7, kind: "fire" },
  ...at("coffin", [[6.2, 8.5], [8.6, 8.9]], Math.PI / 2),
  ...at("debris", [[5, 8.9], [9.9, 8.6]]),
  ...at("stump", [[7.3, 9.8], [7.5, 7.6]]),
  ...at("rocks", [[3.8, 9.3], [11.1, 8.6]]),

  // --- La fosa común (centro) ------------------------------------------------------------------------------
  ...at("coffin", [[6.2, 4.3], [7.4, 4.3]]),
  ...at("brokenTomb", [[5, 4.2], [8.6, 4.4]]),
  ...at("candles", [[4, 4.1], [9.6, 4.3]]),
  ...at("cross", [[3, 4.2], [10.6, 4.1]]),

  // --- La hilera de tumbas (entre el tercer tramo y el último) --------------------------------------
  ...at("tombstone", [[3.5, 0.6], [5.6, 0.6], [7.7, 0.7], [9.8, 0.8], [11.6, 0.9]]),
  ...at("candles", [[4.55, 0.65], [6.65, 0.7], [8.75, 0.8]]),

  // --- Dentro de la curva de la derecha ---------------------------------------------------------------
  ...at("grave", [[11.3, 7.6]]),

  // --- Marco de atrás: árboles muertos y muros en ruinas; la cripta detrás de la meta --------------
  { gx: -1.5, gy: -1.6, kind: "crypt" },
  ...at("deadTree", [[1.4, -2.1], [5.8, -2.1], [10.2, -2.1], [14.2, -1.6]]),
  ...at("wall", [[3.6, -2], [8, -2], [12.2, -2]]),
  ...at("fire", [[0.4, -1.7], [13.2, -1.2]]),

  // --- Marco izquierdo ---------------------------------------------------------------------------------------
  ...at("deadTree", [[-1.8, 0.8], [-1.2, 4.2], [-1.8, 7.4]]),
  ...at("wall", [[-1.8, 2.5], [-1.6, 5.8]], Math.PI / 2),
  ...at("tombstone", [[0.1, 3.6], [0.1, 6.4]]),
  ...at("deadTree", [[-0.4, 8.6]]),

  // --- Rincón de delante a la derecha: tumbas abandonadas ---------------------------------------------
  ...at("brokenTomb", [[13.6, 10.7], [14.5, 11.4]]),
  ...at("tombstone", [[12.9, 11.6]]),
  ...at("debris", [[14.6, 10.1]]),

  // --- Marco derecho: solo cosas bajas -------------------------------------------------------------------
  ...at("rocks", [[14.6, 4.6], [14.6, 8.2]]),
  ...at("tombstone", [[14.6, 6.4], [14.6, 3]]),

  // --- Salida: la tumba abierta de donde salieron los muertos, y el letrero -------------------------
  { gx: -1.1, gy: 10.9, kind: "grave" },
  { gx: -0.4, gy: 11.6, kind: "sign" },
];
