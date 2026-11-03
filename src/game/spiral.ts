// Geometría del tablero en espiral, como el tablero original: la salida abajo a
// la izquierda, el recorrido da vueltas hacia dentro y la tumba (62) ocupa el centro.
//
// En una cuadrícula de 8×8 las tres vueltas completas (28 + 20 + 12 casillas) y la mitad de la última (2)
// suman las 62 casillas, todas iguales (la tumba también ocupa una sola celda); quedan 2 celdas vacías en el centro.

import { BOARD } from "./board";

export const GRID = 8;

export type Cell = { row: number; col: number }; // 0-based
export type Area = Cell & { rows: number; cols: number };

function spiralCells(count: number): { cells: Cell[]; rest: Area } {
  let top = 0;
  let bottom = GRID - 1;
  let left = 0;
  let right = GRID - 1;
  const cells: Cell[] = [];
  const push = (row: number, col: number) => {
    if (cells.length < count) cells.push({ row, col });
  };

  while (cells.length < count) {
    for (let c = left; c <= right; c++) push(bottom, c); // abajo, hacia la derecha
    bottom--;
    if (cells.length >= count) break;
    for (let r = bottom; r >= top; r--) push(r, right); // derecha, hacia arriba
    right--;
    if (cells.length >= count) break;
    for (let c = right; c >= left; c--) push(top, c); // arriba, hacia la izquierda
    top++;
    if (cells.length >= count) break;
    for (let r = top; r <= bottom; r++) push(r, left); // izquierda, hacia abajo
    left++;
  }
  return { cells, rest: { row: top, col: left, rows: bottom - top + 1, cols: right - left + 1 } };
}

const { cells } = spiralCells(BOARD.length);

/** Celda de cada casilla, indexada por número de casilla (todas de 1×1). */
export const TILE_AREA: Record<number, Area> = Object.fromEntries(cells.map((c, i) => [i + 1, { ...c, rows: 1, cols: 1 }] as const));

/** Centro de una casilla en % del tablero (para posicionar las fichas encima). */
export function tileCenter(n: number): { x: number; y: number } {
  const a = TILE_AREA[n];
  return {
    x: ((a.col + a.cols / 2) / GRID) * 100,
    y: ((a.row + a.rows / 2) / GRID) * 100,
  };
}
