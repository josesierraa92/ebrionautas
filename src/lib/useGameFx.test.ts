import { describe, expect, it } from "vitest";
import { stepPath } from "./useGameFx";

describe("recorrido de la ficha", () => {
  it("avanza casilla a casilla", () => {
    expect(stepPath(4, 3)).toEqual([5, 6, 7]);
  });
  it("rebota al pasarse de la Tierra", () => {
    expect(stepPath(59, 6)).toEqual([60, 61, 62, 61, 60, 59]);
  });
});
