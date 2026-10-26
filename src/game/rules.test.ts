import { describe, expect, it } from "vitest";
import { mazeOutcome } from "./rules";

describe("mazeOutcome", () => {
  it("con 5 o 6 se salva y no bebe", () => {
    expect(mazeOutcome("Ana", 5).escaped).toBe(true);
    expect(mazeOutcome("Ana", 6).title).toBe("¡Se salvó!");
  });
  it("con menos de 5 sigue perdido y bebe", () => {
    const r = mazeOutcome("Ana", 4);
    expect(r.escaped).toBe(false);
    expect(r.text).toContain("Bebe 1 vaso");
  });
});
