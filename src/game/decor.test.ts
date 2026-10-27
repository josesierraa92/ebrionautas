import { describe, expect, it } from "vitest";
import { BOARD } from "./board";
import { DECOR, TALL } from "./decor";
import { ISLAND, isoPos } from "./isoPath";

// Reglas de .claude/skills/diseno-tablero: el tablero se ve ordenado y nada tapa el juego.
const path = BOARD.map((t) => isoPos(t.n));

describe("decoración del tablero", () => {
  it("nada encima del camino", () => {
    for (const d of DECOR) {
      const hit = path.find((p) => Math.abs(p.gx - d.gx) < 0.75 && Math.abs(p.gy - d.gy) < 0.75);
      expect(hit, `${d.kind} en (${d.gx}, ${d.gy}) pisa la casilla (${hit?.gx}, ${hit?.gy})`).toBeUndefined();
    }
  });

  it("nada se solapa (un objeto por celda)", () => {
    for (const [i, a] of DECOR.entries())
      for (const b of DECOR.slice(i + 1))
        expect(Math.hypot(a.gx - b.gx, a.gy - b.gy), `${a.kind} (${a.gx}, ${a.gy}) y ${b.kind} (${b.gx}, ${b.gy})`).toBeGreaterThanOrEqual(0.9);
  });

  it("todo cabe dentro de la isla", () => {
    for (const d of DECOR) {
      expect(d.gx, `${d.kind} (${d.gx}, ${d.gy})`).toBeGreaterThanOrEqual(ISLAND.x0 + 0.4);
      expect(d.gx).toBeLessThanOrEqual(ISLAND.x1 - 0.4);
      expect(d.gy, `${d.kind} (${d.gx}, ${d.gy})`).toBeGreaterThanOrEqual(ISLAND.y0 + 0.4);
      expect(d.gy).toBeLessThanOrEqual(ISLAND.y1 - 0.4);
    }
  });

  it("lo alto solo va en el marco de atrás o de la izquierda, donde no tapa casillas", () => {
    for (const d of DECOR.filter((x) => TALL.includes(x.kind)))
      expect(d.gy < -0.5 || d.gx < -0.5, `${d.kind} alto en (${d.gx}, ${d.gy})`).toBe(true);
  });
});
