// Geometría del tablero en espiral, como el tablero original: la salida abajo a
// la izquierda, el recorrido da vueltas hacia dentro y la Tierra (62) ocupa el centro.
//
// En una cuadrícula de 9×9, dos vueltas completas (32 + 24 casillas) y un lado de
// la tercera (5) suman 61 casillas; lo que queda es un rectángulo de 5×4 para la 62.

import { BOARD } from "./board";

export const GRID = 9;

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

const { cells, rest } = spiralCells(BOARD.length - 1);

/** Celda (o área, para la 62) de cada casilla, indexada por número de casilla. */
export const TILE_AREA: Record<number, Area> = Object.fromEntries([
  ...cells.map((c, i) => [i + 1, { ...c, rows: 1, cols: 1 }] as const),
  [BOARD.length, rest] as const,
]);

/** Centro de una casilla en % del tablero (para posicionar las fichas encima). */
export function tileCenter(n: number): { x: number; y: number } {
  const a = TILE_AREA[n];
  return {
    x: ((a.col + a.cols / 2) / GRID) * 100,
    y: ((a.row + a.rows / 2) / GRID) * 100,
  };
}
