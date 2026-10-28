import { describe, expect, it } from "vitest";
import { CHARACTERS, characterOf, FEMALE, MALE, parseSheet, spriteOf } from "./characters";

describe("personajes zombi", () => {
  it("los hombres llevan personajes hombre y las mujeres de mujer, en orden y repitiendo después de 6", () => {
    const players = [
      { id: "p1", gender: "hombre" as const },
      { id: "p2", gender: "mujer" as const },
      { id: "p3", gender: "hombre" as const },
      { id: "p4" },
    ];
    expect(CHARACTERS[characterOf(players, "p1")]).toBe(MALE[0]);
    expect(CHARACTERS[characterOf(players, "p2")]).toBe(FEMALE[0]);
    expect(CHARACTERS[characterOf(players, "p3")]).toBe(MALE[1]);
    expect(CHARACTERS[characterOf(players, "p4")]).toBe(MALE[2]); // sin género, como hombre
    const many = Array.from({ length: 8 }, (_, i) => ({ id: `m${i}`, gender: "mujer" as const }));
    expect(CHARACTERS[characterOf(many, "m6")]).toBe(FEMALE[0]);
  });

  it("mira hacia donde va: de frente si baja por la pantalla, de espaldas si sube; a la izquierda en espejo", () => {
    expect(spriteOf(3, 10, 5, "idle")).toEqual({ row: 3, col: 0, mirror: false });
    expect(spriteOf(3, -10, 5, "walkA")).toEqual({ row: 3, col: 1, mirror: true });
    expect(spriteOf(3, 10, -5, "walkB")).toEqual({ row: 3, col: 5, mirror: false });
    expect(spriteOf(3, -10, -5, "idle")).toEqual({ row: 3, col: 3, mirror: true });
  });

  it("valida la hoja publicada", () => {
    const ok = { image: "https://x.public.blob.vercel-storage.com/tablero/p.webp", cw: 192, ch: 288, feet: 0.8, span: 1.7 };
    expect(parseSheet(ok)).toEqual(ok);
    expect(parseSheet({ ...ok, feet: 3 })).toBeUndefined();
    expect(parseSheet({ ...ok, image: 5 })).toBeUndefined();
    expect(parseSheet(null)).toBeUndefined();
  });
});
