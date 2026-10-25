// Tablero 3D tipo Monopoly: las 62 casillas forman un anillo alrededor de una
// plaza central. Lados de 15 y 14 casillas con una esquina grande al final de
// cada lado: 15+1+14+1+15+1+14+1 = 62. La salida (1) va justo después de la
// esquina 62 (la Tierra), así que la meta queda al lado de la salida, como una vuelta.

import { BOARD } from "./board";

export const CELL = 1.2; // ancho de una casilla normal
export const DEPTH = 2; // fondo del anillo (y lado de las esquinas)
const LONG = 15;
const SHORT = 14;
export const RING_W = LONG * CELL + 2 * DEPTH; // ancho total (eje X)
export const RING_D = SHORT * CELL + 2 * DEPTH; // fondo total (eje Z)

export type RingTile = {
  n: number;
  x: number;
  z: number;
  /** Rotación (Y) para que el borde de color mire hacia la plaza. */
  rot: number;
  corner: boolean;
  w: number; // tamaño a lo largo del lado
  d: number; // tamaño hacia la plaza
};

function build(): RingTile[] {
  const hx = RING_W / 2;
  const hz = RING_D / 2;
  const tiles: RingTile[] = [];
  let n = 1;
  // Lado de delante (z = +hz), de derecha a izquierda; el borde de color mira hacia -z (la plaza).
  const sides = [
    { count: LONG, start: [hx - DEPTH, hz - DEPTH / 2], dir: [-1, 0], rot: 0, corner: [-hx + DEPTH / 2, hz - DEPTH / 2] },
    { count: SHORT, start: [-hx + DEPTH / 2, hz - DEPTH], dir: [0, -1], rot: -Math.PI / 2, corner: [-hx + DEPTH / 2, -hz + DEPTH / 2] },
    { count: LONG, start: [-hx + DEPTH, -hz + DEPTH / 2], dir: [1, 0], rot: Math.PI, corner: [hx - DEPTH / 2, -hz + DEPTH / 2] },
    { count: SHORT, start: [hx - DEPTH / 2, -hz + DEPTH], dir: [0, 1], rot: Math.PI / 2, corner: [hx - DEPTH / 2, hz - DEPTH / 2] },
  ] as const;
  for (const s of sides) {
    for (let i = 0; i < s.count; i++) {
      const along = (i + 0.5) * CELL;
      tiles.push({ n: n++, x: s.start[0] + s.dir[0] * along, z: s.start[1] + s.dir[1] * along, rot: s.rot, corner: false, w: CELL, d: DEPTH });
    }
    tiles.push({ n: n++, x: s.corner[0], z: s.corner[1], rot: s.rot, corner: true, w: DEPTH, d: DEPTH });
  }
  return tiles;
}

export const RING = build();
if (RING.length !== BOARD.length) throw new Error(`El anillo tiene ${RING.length} casillas`);

export function ringTile(n: number): RingTile {
  return RING[n - 1];
}
