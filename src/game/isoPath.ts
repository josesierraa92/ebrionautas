// Recorrido del tablero isométrico (horizontal, para la TV): el camino serpentea
// en 4 filas sobre una isla. Coordenadas de cuadrícula (gx a lo ancho, gy en
// profundidad); la proyección a pantalla está en IsoBoard.
//
// Fila 1: 15 casillas hacia la derecha, conector, fila 2 hacia la izquierda,
// conector, fila 3, conector y fila 4 de 14 casillas: 15+1+15+1+15+1+14 = 62.

import { BOARD } from "./board";

export const ISO_COLS = 15;
export const ISO_ROWS = 7; // filas de casillas en gy = 6, 4, 2, 0 y conectores en medio

export type GridPos = { gx: number; gy: number };

function buildPath(): GridPos[] {
  const path: GridPos[] = [];
  const rows = [6, 4, 2, 0];
  rows.forEach((gy, r) => {
    const forward = r % 2 === 0;
    const len = r === rows.length - 1 ? ISO_COLS - 1 : ISO_COLS;
    for (let i = 0; i < len; i++) path.push({ gx: forward ? i : ISO_COLS - 1 - i, gy });
    if (r < rows.length - 1) path.push({ gx: forward ? ISO_COLS - 1 : 0, gy: gy - 1 });
  });
  return path;
}

const PATH = buildPath();
if (PATH.length !== BOARD.length) throw new Error(`El recorrido isométrico tiene ${PATH.length} casillas`);

/** Posición en la cuadrícula de cada casilla (1..62). */
export function isoPos(n: number): GridPos {
  return PATH[n - 1];
}
