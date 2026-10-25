import { describe, expect, it } from "vitest";
import { SKINS, avatarOf, defaultAvatar, expressionFor } from "./avatar";
import { createGame } from "./engine";

describe("avatar", () => {
  it("cada jugador es un marciano del color de su asiento", () => {
    const a = defaultAvatar(2, SKINS[2]);
    expect(a).toMatchObject({ skin: SKINS[2], costume: "marciano" });
    expect(avatarOf({ id: "p3", color: SKINS[2] })).toEqual(a); // partidas guardadas sin avatar
  });

  it("la cara refleja cómo le va en la partida", () => {
    const [p] = createGame([{ name: "Ana", color: SKINS[0] }]).players;
    expect(expressionFor(p)).toBe("normal");
    expect(expressionFor(p, { isTurn: true })).toBe("feliz");
    expect(expressionFor({ ...p, pending: 5 })).toBe("mareado");
    expect(expressionFor({ ...p, status: { ...p.status, carcel: { bail: 3, at: 26 } } })).toBe("triste");
    expect(expressionFor({ ...p, status: { ...p.status, hipnosis: true } })).toBe("abducido");
    expect(expressionFor({ ...p, status: { ...p.status, inmune: true } })).toBe("chulo");
    expect(expressionFor(p, { winner: p.id })).toBe("euforico");
  });
});
