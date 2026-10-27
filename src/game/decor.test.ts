import { describe, expect, it } from "vitest";
import { BOARD } from "./board";
import { DECOR, HEIGHT, RADIUS } from "./decor";
import { ISLAND, isoPos } from "./isoPath";

// Reglas de .claude/skills/diseno-tablero: el tablero se ve ordenado y nada tapa el juego.
const path = BOARD.map((t) => isoPos(t.n));
const radius = (k: (typeof DECOR)[number]["kind"]) => RADIUS[k] ?? 0.35;
const TILE_R = 0.47;

describe("decoración del tablero", () => {
  it("nada encima del camino", () => {
    for (const d of DECOR) {
      const hit = path.findIndex((p) => Math.hypot(p.gx - d.gx, p.gy - d.gy) < TILE_R + radius(d.kind));
      expect(hit, `${d.kind} en (${d.gx}, ${d.gy}) pisa la casilla ${hit + 1}`).toBe(-1);
    }
  });

  it("nada tapa una casilla desde la cámara", () => {
    // Un objeto delante de una casilla (más cerca de la cámara) y en su misma columna de pantalla la tapa
    // si es más alto de lo que los separa en pantalla.
    for (const d of DECOR)
      path.forEach((p, i) => {
        const column = Math.abs(d.gx - d.gy - (p.gx - p.gy)) * 50; // separación horizontal en pantalla (px)
        const ahead = (d.gx + d.gy - (p.gx + p.gy)) * 25; // cuánto más abajo en pantalla está el objeto (px)
        const covers = column < 45 + radius(d.kind) * 50 && ahead > 0 && ahead < HEIGHT[d.kind] * 61 + 8;
        expect(covers, `${d.kind} en (${d.gx}, ${d.gy}) tapa la casilla ${i + 1}`).toBe(false);
      });
  });

  it("nada se solapa", () => {
    for (const [i, a] of DECOR.entries())
      for (const b of DECOR.slice(i + 1))
        expect(Math.hypot(a.gx - b.gx, a.gy - b.gy), `${a.kind} (${a.gx}, ${a.gy}) y ${b.kind} (${b.gx}, ${b.gy})`).toBeGreaterThanOrEqual(
          Math.max(0.9, radius(a.kind) + radius(b.kind)),
        );
  });

  it("todo cabe dentro de la isla", () => {
    for (const d of DECOR) {
      const m = radius(d.kind) + 0.1;
      const where = `${d.kind} (${d.gx}, ${d.gy})`;
      expect(d.gx - m, where).toBeGreaterThanOrEqual(ISLAND.x0);
      expect(d.gx + m, where).toBeLessThanOrEqual(ISLAND.x1);
      expect(d.gy - m, where).toBeGreaterThanOrEqual(ISLAND.y0);
      expect(d.gy + m, where).toBeLessThanOrEqual(ISLAND.y1);
    }
  });
});
