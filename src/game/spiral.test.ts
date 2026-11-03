import { describe, expect, it } from "vitest";
import { GRID, TILE_AREA, tileCenter } from "./spiral";

describe("tablero en espiral", () => {
  it("empieza abajo a la izquierda y avanza hacia la derecha", () => {
    expect(TILE_AREA[1]).toMatchObject({ row: GRID - 1, col: 0 });
    expect(TILE_AREA[2]).toMatchObject({ row: GRID - 1, col: 1 });
    expect(TILE_AREA[GRID + 1]).toMatchObject({ row: GRID - 2, col: GRID - 1 }); // sube por la derecha
  });

  it("cada casilla es vecina de la siguiente y ninguna se pisa", () => {
    const used = new Set<string>();
    for (let n = 1; n <= 62; n++) {
      const a = TILE_AREA[n];
      expect(used.has(`${a.row},${a.col}`)).toBe(false);
      used.add(`${a.row},${a.col}`);
      if (n > 1) {
        const b = TILE_AREA[n - 1];
        expect(Math.abs(a.row - b.row) + Math.abs(a.col - b.col)).toBe(1);
      }
    }
  });

  it("las 62 casillas son del mismo tamaño y caben en la cuadrícula", () => {
    for (let n = 1; n <= 62; n++) {
      const a = TILE_AREA[n];
      expect([a.rows, a.cols]).toEqual([1, 1]);
      expect(a.row).toBeGreaterThanOrEqual(0);
      expect(a.row).toBeLessThan(GRID);
      expect(a.col).toBeLessThan(GRID);
    }
    expect(tileCenter(1).x).toBeCloseTo(100 / GRID / 2, 5);
  });
});
