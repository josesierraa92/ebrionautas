import { describe, expect, it } from "vitest";
import { GRID, TILE_AREA, tileCenter } from "./spiral";

describe("tablero en espiral", () => {
  it("empieza abajo a la izquierda y avanza hacia la derecha", () => {
    expect(TILE_AREA[1]).toMatchObject({ row: GRID - 1, col: 0 });
    expect(TILE_AREA[2]).toMatchObject({ row: GRID - 1, col: 1 });
    expect(TILE_AREA[10]).toMatchObject({ row: GRID - 2, col: GRID - 1 }); // sube por la derecha
  });

  it("cada casilla es vecina de la siguiente y ninguna se pisa", () => {
    const used = new Set<string>();
    for (let n = 1; n <= 61; n++) {
      const a = TILE_AREA[n];
      expect(used.has(`${a.row},${a.col}`)).toBe(false);
      used.add(`${a.row},${a.col}`);
      if (n > 1) {
        const b = TILE_AREA[n - 1];
        expect(Math.abs(a.row - b.row) + Math.abs(a.col - b.col)).toBe(1);
      }
    }
  });

  it("la Tierra (62) llena exactamente el hueco del centro", () => {
    const t = TILE_AREA[62];
    expect(t.rows * t.cols).toBe(GRID * GRID - 61);
    for (let r = t.row; r < t.row + t.rows; r++)
      for (let c = t.col; c < t.col + t.cols; c++)
        for (let n = 1; n <= 61; n++) expect([TILE_AREA[n].row, TILE_AREA[n].col]).not.toEqual([r, c]);
    expect(tileCenter(62).x).toBeCloseTo(50, 0);
  });
});
