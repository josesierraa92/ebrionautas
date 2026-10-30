import { describe, expect, it } from "vitest";
import { ACTION_TYPES } from "./actionTypes";

describe("acciones que acepta el servidor", () => {
  it("incluye las que añadimos a mano desde el celular", () => {
    for (const t of ["NUNCA", "ADD_DRINK", "JAIL_PAY", "RANKING", "DUEL_ROLL"]) expect(ACTION_TYPES.has(t)).toBe(true);
    expect(ACTION_TYPES.has("HACKEAR")).toBe(false);
  });
});
