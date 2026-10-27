// Decoración del tablero isométrico (coordenadas de cuadrícula, ver isoPath.ts). La comparten el render 3D
// (scripts/board3d) y la TV. Sigue las reglas de .claude/skills/diseno-tablero: zonas, cuadrícula, ritmo y
// simetría; nada encima del camino ni fuera de la isla (lo comprueba decor.test.ts).
//
// Recorrido: tramos en gy = 9, 6, 3, 0 (gx 0–13); conectores en (13, 8–7), (0, 5–4) y (13, 2–1).

export type DecoKind =
  | "pine" // pino verde (alto: solo en el marco)
  | "pineFall" // pino de otoño, naranja (alto: solo en el marco)
  | "lantern" // farol (alto: solo en el marco)
  | "crypt" // cripta grande (detrás de la meta)
  | "tombstone"
  | "cross"
  | "candles"
  | "marigold" // mata de cempasúchil
  | "ofrenda"
  | "grave" // tumba de tierra con cruz
  | "sign"; // letrero "PANTEÓN" en la salida

export type Deco = { gx: number; gy: number; kind: DecoKind; turn?: number };

/** Objetos altos: solo pueden ir en el marco (detrás o a la izquierda), donde no tapan casillas. */
export const TALL: DecoKind[] = ["pine", "pineFall", "lantern", "crypt"];

const row = (kind: DecoKind | DecoKind[], gy: number, xs: number[], turn?: number): Deco[] =>
  xs.map((gx, i) => ({ gx, gy, kind: Array.isArray(kind) ? kind[i % kind.length] : kind, turn }));

export const DECOR: Deco[] = [
  // --- Franja 1 (entre los tramos 9 y 6): hilera de tumbas con velas entre ellas -------------------
  ...row("tombstone", 7.5, [1, 3, 5, 7, 9, 11]),
  ...row("candles", 7.5, [2, 4, 6, 8, 10]),
  ...row("marigold", 7.5, [0, 12]),

  // --- Franja 2 (entre 6 y 3): la ofrenda en el centro, simétrica ---------------------------------
  { gx: 7, gy: 4.5, kind: "ofrenda" },
  ...row("candles", 4.5, [6, 8]),
  ...row("marigold", 4.5, [5, 9]),
  ...row("cross", 4.5, [2.5, 11.5]),
  ...row("marigold", 4.5, [1.5, 3.5, 10.5, 12.5]),

  // --- Franja 3 (entre 3 y 0): tumbas de tierra recién cavadas, en fila ---------------------------
  ...row("grave", 1.5, [1.5, 4.5, 7.5, 10.5]),
  ...row("candles", 1.5, [3, 6, 9]),

  // --- Marco de atrás: bosque en dos filas al tresbolillo, la cripta detrás de la meta ------------
  { gx: -1.4, gy: -1.4, kind: "crypt" },
  ...row(["pine", "pineFall"], -1.2, [1.2, 3.6, 6, 8.4, 10.8, 13.2]),
  ...row(["pineFall", "pine"], -2, [2.4, 4.8, 7.2, 9.6, 12]),

  // --- Marco izquierdo: bosque (lo alto aquí no tapa casillas) ------------------------------------
  // dos filas al tresbolillo, como el fondo
  ...[0.4, 2, 3.6, 5.2, 6.8].map((gy, i): Deco => ({ gx: i % 2 ? -1.3 : -2, gy, kind: i % 2 ? "pine" : "pineFall" })),

  // --- Faroles en las esquinas del marco ------------------------------------------------------------
  { gx: -1.2, gy: 8.2, kind: "lantern" },
  { gx: 14.6, gy: -1.2, kind: "lantern" },

  // --- Marco derecho y de delante: solo cosas bajas (lo alto taparía casillas) ----------------------
  ...row("marigold", 0.5, [14.6]),
  ...[2.5, 4.5, 6.5, 8.5].map((gy, i): Deco => ({ gx: 14.6, gy, kind: i % 2 ? "marigold" : "tombstone" })),
  ...row("marigold", 10.3, [3, 6, 9, 12]),

  // --- Salida: la tumba abierta de donde salieron los muertos, y el letrero -------------------------
  { gx: -1.3, gy: 9.8, kind: "grave" },
  { gx: -0.3, gy: 10.3, kind: "sign" },
];
