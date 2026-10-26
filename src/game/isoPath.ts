// Recorrido del tablero isométrico 2.5D de la TV. Coordenadas de cuadrícula
// (gx a lo ancho, gy en profundidad; gy grande = más cerca de la cámara).
//
// Cuatro tramos de 14 casillas separados por dos filas de césped (para la
// decoración) y unidos por conectores de 2 casillas: 14·4 + 2·3 = 62.
// La salida está delante a la izquierda y la Tierra (62) al fondo a la izquierda.

import { BOARD } from "./board";

export const ISO_COLS = 14;
export const ISO_ROWS = 10;
const ROWS = [9, 6, 3, 0];

export type GridPos = { gx: number; gy: number };

function buildPath(): GridPos[] {
  const path: GridPos[] = [];
  ROWS.forEach((gy, r) => {
    const forward = r % 2 === 0;
    for (let i = 0; i < ISO_COLS; i++) path.push({ gx: forward ? i : ISO_COLS - 1 - i, gy });
    if (r < ROWS.length - 1) {
      const gx = forward ? ISO_COLS - 1 : 0;
      path.push({ gx, gy: gy - 1 }, { gx, gy: gy - 2 });
    }
  });
  return path;
}

const PATH = buildPath();
if (PATH.length !== BOARD.length) throw new Error(`El recorrido isométrico tiene ${PATH.length} casillas`);

/** Posición en la cuadrícula de cada casilla (1..62). */
export function isoPos(n: number): GridPos {
  return PATH[n - 1];
}

/** ¿Hay camino en esta celda? (para no plantar decoración encima). */
export function isPathCell(gx: number, gy: number): boolean {
  return PATH.some((p) => p.gx === Math.round(gx) && p.gy === Math.round(gy));
}
