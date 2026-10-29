import { afterEach, describe, expect, it } from "vitest";
import { cardCatalog, setCardOverrides } from "./cards";
import { createGame } from "./engine";
import { jailOutcome, mazeOutcome, tileRule } from "./rules";

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

describe("textos de las tarjetas", () => {
  const game = createGame([
    { name: "Ana", color: "#00ff00", gender: "mujer" },
    { name: "Beto", color: "#0000ff", gender: "hombre" },
  ]);
  afterEach(() => setCardOverrides({}));

  it("los de serie dicen lo de siempre", () => {
    expect(tileRule(6, game, "p1")).toEqual({ title: "¡Ronda de mezcal!", text: "Ana reparte 1 vaso entre quien quiera (también se los puede quedar)." });
    expect(tileRule(7, game, "p1").text).toBe("Ana reta hasta a 1 rival. Uno a uno tiran el dado: quien saque menos bebe 1 vaso. Si empatan, se repite.");
    expect(tileRule(8, game, "p1").text).toContain("volar hasta la casilla 18 y volver a tirar");
    expect(tileRule(58, game, "p1").text).toContain("volver a tirar (es el último murciélago)");
    expect(tileRule(43, game, "p1").text).toContain("bebe 4 vasos de golpe o rueda hasta la casilla 12.");
    expect(tileRule(3, game, "p1")).toEqual({ title: "Cegatos", text: "Juicio de los vivos: beben 1 vaso quienes lleven gafas o lentillas." });
    expect(tileRule(12, game, "p1").text).toContain("por detrás de Ana. Esta vez, nadie.");
    expect(tileRule(15, game, "p1").text).toBe("Cuenta un chiste. Si a nadie le hace gracia, bebes 2 vasos.");
    expect(jailOutcome("Ana", 5).text).toContain("bebe 4 vasos");
  });

  it("lo que cambia el admin sustituye al de serie y rellena los huecos", () => {
    setCardOverrides({ A_BEBER: { title: "¡Salud!", text: "{nombre} manda beber {vasos}." }, "RETO:Cómicos": { title: "Chistosos" } });
    expect(tileRule(6, game, "p1")).toEqual({ title: "¡Salud!", text: "Ana manda beber 1 vaso." });
    expect(tileRule(14, game, "p2").text).toBe("Beto manda beber 2 vasos."); // otra casilla de la misma tarjeta (reparte 2)
    expect(tileRule(15, game, "p1")).toEqual({ title: "Chistosos", text: "Cuenta un chiste. Si a nadie le hace gracia, bebes 2 vasos." });
    expect(mazeOutcome("Ana", 6).title).toBe("¡Se salvó!");
  });

  it("hay una tarjeta por clase de casilla y las de resultado", () => {
    const keys = cardCatalog().map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("A_BEBER");
    expect(keys).toContain("RASGO:Machos");
    expect(cardCatalog().find((c) => c.key === "A_BEBER")?.tiles).toEqual([6, 14, 22, 30, 49, 59]);
    expect(keys.filter((k) => k.startsWith("RESULTADO"))).toHaveLength(3);
  });
});
