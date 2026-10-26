import { describe, expect, it } from "vitest";
import { isPathCell, isoPos } from "./isoPath";

describe("recorrido isométrico", () => {
  it("cada casilla es vecina de la siguiente y ninguna se repite", () => {
    const seen = new Set<string>();
    for (let n = 1; n <= 62; n++) {
      const p = isoPos(n);
      expect(seen.has(`${p.gx},${p.gy}`)).toBe(false);
      seen.add(`${p.gx},${p.gy}`);
      if (n > 1) {
        const q = isoPos(n - 1);
        expect(Math.abs(p.gx - q.gx) + Math.abs(p.gy - q.gy)).toBe(1);
      }
    }
  });

  it("sale delante a la izquierda y termina al fondo a la izquierda", () => {
    expect(isoPos(1)).toEqual({ gx: 0, gy: 9 });
    expect(isoPos(62)).toEqual({ gx: 0, gy: 0 });
    expect(isPathCell(5, 7)).toBe(false);
  });
});
