// Recorrido del tablero de la TV, al estilo Mario Party: un camino que serpentea por el panteón rodeando
// los lugares importantes (el lago de calimocho delante, la plaza de la ofrenda en el centro, la hilera
// de tumbas) y sube hasta la tumba de la meta, al fondo. Coordenadas de suelo: gx a lo ancho, gy en
// profundidad (gy grande = más cerca de la cámara). 1 unidad = 1 casilla.
//
// El trazado son puntos de paso unidos con una curva suave (Catmull-Rom); las 62 casillas se reparten a
// la misma distancia a lo largo de la curva.

import { BOARD } from "./board";

export type GridPos = { gx: number; gy: number };

/** Puntos de paso del camino, de la salida (delante a la izquierda) a la meta (al fondo). */
export const ROUTE: [number, number][] = [
  [0.6, 10.4], [3, 10.9], [5.6, 10.9], [8.2, 10.9], [10.8, 10.6], [12.7, 9.3], [13.2, 7.3], [12, 5.7], [9.6, 5.5],
  [7.2, 6.4], [4.8, 7], [2.6, 6.6], [1.4, 4.8], [2, 2.9], [4, 2], [6.4, 2.1], [8.8, 2.6], [11.2, 2.8], [13.2, 2],
  [13.6, 0.2], [11.8, -0.8], [9.4, -0.6], [7, -1], [4.6, -0.6], [2.4, -0.9], [0.6, -0.2],
];

function catmullRom(p0: number[], p1: number[], p2: number[], p3: number[], t: number): GridPos {
  const f = (i: number) =>
    0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t * t + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t ** 3);
  return { gx: f(0), gy: f(1) };
}

/** Curva densa por los puntos de paso (también la usa el render para pintar el sendero). */
export function routeCurve(samples = 200): GridPos[] {
  const pts: GridPos[] = [];
  const P = [ROUTE[0], ...ROUTE, ROUTE[ROUTE.length - 1]];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < samples; k++) pts.push(catmullRom(P[i - 1], P[i], P[i + 1], P[i + 2], k / samples));
  pts.push({ gx: ROUTE[ROUTE.length - 1][0], gy: ROUTE[ROUTE.length - 1][1] });
  return pts;
}

/** Reparte `n` casillas a la misma distancia a lo largo de la curva. */
function buildPath(n: number): GridPos[] {
  const pts = routeCurve();
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].gx - pts[i - 1].gx, pts[i].gy - pts[i - 1].gy));
  const total = acc[acc.length - 1];
  const out: GridPos[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    while (j < acc.length - 2 && acc[j + 1] < target) j++;
    const t = acc[j + 1] > acc[j] ? (target - acc[j]) / (acc[j + 1] - acc[j]) : 0;
    out.push({ gx: pts[j].gx + (pts[j + 1].gx - pts[j].gx) * t, gy: pts[j].gy + (pts[j + 1].gy - pts[j].gy) * t });
  }
  return out;
}

const PATH = buildPath(BOARD.length);

/** Posición en el suelo de cada casilla (1..62). */
export function isoPos(n: number): GridPos {
  return PATH[n - 1];
}

// --- Proyección isométrica 2:1 (la comparten la TV y el render 3D del tablero) ---------
/** Píxeles (SVG) en pantalla de un punto del suelo. */
export const isoSx = (gx: number, gy: number) => (gx - gy) * 50;
export const isoSy = (gx: number, gy: number) => (gx + gy) * 25;
/** La isla deja margen alrededor del recorrido para el marco (bosque, reja, cripta). */
export const ISLAND = { x0: -2.6, x1: 15.2, y0: -2.6, y1: 12.2, thickness: 46 };
/** Rectángulo visible (píxeles SVG): la isla, la meta de arriba y la sombra de abajo. */
export const ISO_VIEW = {
  x: isoSx(ISLAND.x0, ISLAND.y1) - 30,
  y: isoSy(ISLAND.x0, ISLAND.y0) - 190,
  w: isoSx(ISLAND.x1, ISLAND.y0) - isoSx(ISLAND.x0, ISLAND.y1) + 60,
  h: isoSy(ISLAND.x1, ISLAND.y1) - isoSy(ISLAND.x0, ISLAND.y0) + ISLAND.thickness + 250,
};
