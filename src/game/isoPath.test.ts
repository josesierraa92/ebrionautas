import { describe, expect, it } from "vitest";
import { isoPos } from "./isoPath";

const dist = (a: number, b: number) => Math.hypot(isoPos(a).gx - isoPos(b).gx, isoPos(a).gy - isoPos(b).gy);

describe("recorrido del tablero", () => {
  it("cada casilla está a ~1 casilla de la siguiente", () => {
    for (let n = 2; n <= 62; n++) {
      expect(dist(n, n - 1)).toBeGreaterThan(0.85);
      expect(dist(n, n - 1)).toBeLessThan(1.15);
    }
  });

  it("los tramos que pasan cerca no se tocan (queda sitio para la decoración)", () => {
    for (let a = 1; a <= 62; a++) for (let b = a + 3; b <= 62; b++) expect(dist(a, b), `${a} y ${b}`).toBeGreaterThan(2);
  });

  it("sale delante a la izquierda y termina al fondo", () => {
    expect(isoPos(1).gy).toBeGreaterThan(10);
    expect(isoPos(62).gy).toBeLessThan(0.5);
  });
});
