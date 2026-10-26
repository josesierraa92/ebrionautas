// Decoración del tablero isométrico (en coordenadas de cuadrícula, ver isoPath.ts).
// La comparten el render 3D del tablero (scripts/board3d) y la TV.

export type DecoKind =
  | "tree" | "tree2" | "ptree" | "pine" | "bush" | "mush" | "rock" | "logs" | "cauldron" | "tent" | "flowers" | "rocket"
  | "pond" | "crater" | "sign";
export type Deco = { gx: number; gy: number; kind: DecoKind };

// Entre los tramos solo cosas bajitas (lo alto taparía las casillas de detrás); árboles y tienda, en el borde.
export const DECOR: Deco[] = [
  { gx: -0.8, gy: 9.8, kind: "rocket" },
  { gx: 0.4, gy: 10.1, kind: "sign" },
  // entre el primer y el segundo tramo
  { gx: 1.6, gy: 7.6, kind: "bush" },
  { gx: 3.6, gy: 7.8, kind: "mush" },
  { gx: 6.5, gy: 7.5, kind: "pond" },
  { gx: 9.2, gy: 7.9, kind: "flowers" },
  { gx: 10.6, gy: 7.5, kind: "logs" },
  { gx: 12, gy: 7.8, kind: "rock" },
  // entre el segundo y el tercero
  { gx: 1.8, gy: 4.6, kind: "flowers" },
  { gx: 3.5, gy: 4.4, kind: "cauldron" },
  { gx: 5.4, gy: 4.8, kind: "bush" },
  { gx: 7.5, gy: 4.5, kind: "crater" },
  { gx: 9.8, gy: 4.6, kind: "mush" },
  { gx: 11.8, gy: 4.4, kind: "flowers" },
  // entre el tercero y el cuarto
  { gx: 2.2, gy: 1.6, kind: "rock" },
  { gx: 4.3, gy: 1.5, kind: "bush" },
  { gx: 6.4, gy: 1.7, kind: "logs" },
  { gx: 8.6, gy: 1.6, kind: "flowers" },
  { gx: 10.4, gy: 1.5, kind: "mush" },
  { gx: 12.2, gy: 1.7, kind: "bush" },
  // bosque alrededor (detrás y a los lados)
  ...[0.3, 1.7, 4.6, 6, 8.4, 9.8, 11.2, 12.6].map((gx, i): Deco => ({ gx, gy: -1, kind: (["pine", "tree", "pine", "ptree", "tree", "pine", "tree2", "tree"] as const)[i] })),
  { gx: 3, gy: -1.1, kind: "tent" },
  { gx: 13.9, gy: -0.9, kind: "pine" },
  ...[1.6, 4.6, 7.4].map((gy, i): Deco => ({ gx: -1, gy, kind: (["tree", "pine", "ptree"] as const)[i] })),
  ...[0.4, 3.6, 6.6, 9.6].map((gy, i): Deco => ({ gx: 14.1, gy, kind: (["tree2", "pine", "tree", "pine"] as const)[i] })),
  ...[3, 6.5, 10, 12.6].map((gx, i): Deco => ({ gx, gy: 10.1, kind: (["bush", "flowers", "bush", "mush"] as const)[i] })),
];
