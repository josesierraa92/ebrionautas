import { describe, expect, it } from "vitest";
import { DEFAULT_AVATAR, SKINS, avatarOf, expressionFor, sanitizeAvatar } from "./avatar";
import { createGame } from "./engine";
import { recordGame, traitAnswer } from "@/lib/profile";

describe("avatar", () => {
  it("descarta valores desconocidos al validar", () => {
    expect(sanitizeAvatar({ skin: "#000000", eyes: "laser", mouth: "dientes", costume: "pirata", extra: 1 })).toEqual({
      ...DEFAULT_AVATAR,
      mouth: "dientes",
      costume: "pirata",
    });
    expect(sanitizeAvatar(null, SKINS[3]).skin).toBe(SKINS[3]);
    expect(sanitizeAvatar("basura").costume).toBe("marciano");
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

  it("los jugadores de partidas viejas sin avatar reciben uno por defecto", () => {
    const a = avatarOf({ id: "p3", color: SKINS[2] });
    expect(a.skin).toBe(SKINS[2]);
    expect(a.costume).toBe("preso");
  });
});

describe("perfil", () => {
  it("traduce las respuestas del perfil a los rasgos de las casillas", () => {
    const t = { genero: "mujer" as const, anioNacimiento: 1992, gafas: false };
    expect(traitAnswer(t, "mujer")).toBe(true);
    expect(traitAnswer(t, "hombre")).toBe(false);
    expect(traitAnswer(t, "anio_par")).toBe(true);
    expect(traitAnswer(t, "anio_impar")).toBe(false);
    expect(traitAnswer(t, "gafas")).toBe(false);
    expect(traitAnswer(t, "mascota")).toBeUndefined();
    expect(traitAnswer({}, "hombre")).toBeUndefined();
  });

  it("suma cada partida terminada una sola vez", () => {
    const game = createGame([
      { name: "Ana", color: SKINS[0] },
      { name: "Beto", color: SKINS[1] },
    ]);
    const profile = { name: "Ana", avatar: DEFAULT_AVATAR, traits: {}, stats: { partidas: 0, victorias: 0, vasos: 0 }, counted: [] };
    expect(recordGame(profile, "ABCD", game, "p1")).toBeNull(); // sin terminar
    const done = { ...game, winner: "p1", players: game.players.map((p) => ({ ...p, drunk: 7 })) };
    const next = recordGame(profile, "ABCD", done, "p1")!;
    expect(next.stats).toEqual({ partidas: 1, victorias: 1, vasos: 7 });
    expect(recordGame(next, "ABCD", done, "p1")).toBeNull();
  });
});
