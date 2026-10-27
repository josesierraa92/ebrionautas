// Decoración del tablero isométrico (en coordenadas de cuadrícula, ver isoPath.ts).
// La comparten el render 3D del tablero (scripts/board3d) y la TV.

export type DecoKind =
  | "cypress" | "jacaranda" | "deadtree" | "marigold" | "candles" | "tombstone" | "cross" | "petals" | "ofrenda" | "mausoleum" | "grave"
  | "pond" | "fosa" | "sign";
export type Deco = { gx: number; gy: number; kind: DecoKind };

// Panteón de Día de Muertos. Entre los tramos solo cosas bajitas (lo alto taparía las casillas de detrás);
// cipreses, árboles y el mausoleo, en el borde.
export const DECOR: Deco[] = [
  { gx: -0.8, gy: 9.8, kind: "grave" },
  { gx: 0.4, gy: 10.1, kind: "sign" },
  // entre el primer y el segundo tramo
  { gx: 1.6, gy: 7.6, kind: "marigold" },
  { gx: 3.6, gy: 7.8, kind: "candles" },
  { gx: 6.5, gy: 7.5, kind: "pond" },
  { gx: 9.2, gy: 7.9, kind: "petals" },
  { gx: 10.6, gy: 7.5, kind: "cross" },
  { gx: 12, gy: 7.8, kind: "tombstone" },
  // entre el segundo y el tercero
  { gx: 1.8, gy: 4.6, kind: "petals" },
  { gx: 3.5, gy: 4.4, kind: "ofrenda" },
  { gx: 5.4, gy: 4.8, kind: "marigold" },
  { gx: 7.5, gy: 4.5, kind: "fosa" },
  { gx: 9.8, gy: 4.6, kind: "candles" },
  { gx: 11.8, gy: 4.4, kind: "petals" },
  // entre el tercero y el cuarto
  { gx: 2.2, gy: 1.6, kind: "tombstone" },
  { gx: 4.3, gy: 1.5, kind: "marigold" },
  { gx: 6.4, gy: 1.7, kind: "cross" },
  { gx: 8.6, gy: 1.6, kind: "petals" },
  { gx: 10.4, gy: 1.5, kind: "candles" },
  { gx: 12.2, gy: 1.7, kind: "marigold" },
  // bosque alrededor (detrás y a los lados)
  ...[0.3, 1.7, 4.6, 6, 8.4, 9.8, 11.2, 12.6].map((gx, i): Deco => ({ gx, gy: -1, kind: (["cypress", "jacaranda", "cypress", "deadtree", "jacaranda", "cypress", "cypress", "jacaranda"] as const)[i] })),
  { gx: 3, gy: -1.1, kind: "mausoleum" },
  { gx: 13.9, gy: -0.9, kind: "cypress" },
  ...[1.6, 4.6, 7.4].map((gy, i): Deco => ({ gx: -1, gy, kind: (["jacaranda", "cypress", "deadtree"] as const)[i] })),
  ...[0.4, 3.6, 6.6, 9.6].map((gy, i): Deco => ({ gx: 14.1, gy, kind: (["cypress", "cypress", "jacaranda", "cypress"] as const)[i] })),
  ...[3, 6.5, 10, 12.6].map((gx, i): Deco => ({ gx, gy: 10.1, kind: (["marigold", "petals", "marigold", "candles"] as const)[i] })),
];
