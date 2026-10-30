import { afterEach, describe, expect, it } from "vitest";
import { CARD_GROUPS, cardCatalog, groupOf, parseCardOverrides, setCardOverrides } from "./cards";
import { createGame } from "./engine";
import { jailOutcome, mazeOutcome, staticCardVars, tileRule } from "./rules";

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
    expect(tileRule(6, game, "p1")).toEqual({ title: "Trago de regalo", text: "Ana reparte 1 vaso entre quien quiera (también se los puede quedar)." });
    expect(tileRule(19, game, "p1").text).toBe("Ana reta hasta a 1 rival. Uno a uno tiran el dado: quien saque menos bebe 1 vaso. Si empatan, se repite.");
    expect(tileRule(8, game, "p1").text).toContain("volar hasta la casilla 18 y volver a tirar");
    expect(tileRule(58, game, "p1").text).toContain("para volver a tirar: es el último murciélago");
    expect(tileRule(43, game, "p1").text).toContain("bebe 2 vasos seguidos o rueda hasta la casilla 12.");
    expect(tileRule(3, game, "p1").title).toBe("Juicio de los vivos");
    expect(tileRule(12, game, "p1").text).toContain("por detrás de Ana. Esta vez, nadie.");
    expect(tileRule(15, game, "p1").text).toBe("Cuenta un chiste. Si a nadie le hace gracia, bebes 2 vasos.");
    expect(jailOutcome("Ana", 5).text).toContain("debe 4 vasos");
  });

  it("lo que cambia el admin sustituye al de serie y rellena los huecos", () => {
    setCardOverrides({ A_BEBER: { title: "¡Salud!", text: "{nombre} manda beber {vasos}." }, "RETO:Cómicos": { title: "Chistosos" } });
    expect(tileRule(6, game, "p1")).toEqual({ title: "¡Salud!", text: "Ana manda beber 1 vaso." });
    expect(tileRule(30, game, "p2").text).toBe("Beto manda beber 3 vasos."); // otra casilla de la misma tarjeta (nunca más de 3)
    expect(tileRule(15, game, "p1")).toEqual({ title: "Chistosos", text: "Cuenta un chiste. Si a nadie le hace gracia, bebes 2 vasos." });
    expect(mazeOutcome("Ana", 6).title).toBe("¡Se salvó!");
  });

  it("hay una tarjeta por clase de casilla y las de resultado", () => {
    const keys = cardCatalog().map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("A_BEBER");
    expect(keys).toContain("RASGO");
    expect(cardCatalog().find((c) => c.key === "RASGO")?.tiles).toHaveLength(9);
    expect(cardCatalog().find((c) => c.key === "A_BEBER")?.tiles).toEqual([6, 30, 59]);
    expect(keys.filter((k) => k.startsWith("RESULTADO"))).toHaveLength(7);
  });
});

describe("textos viejos guardados en el editor", () => {
  it("un texto que es justo el de serie anterior no cuenta como edición (así se ve el nuevo)", () => {
    const old = parseCardOverrides({
      OCA: { text: "{nombre} bebe 1 vaso diciendo «¡De murciélago en murciélago y bebo porque me toca!»; {destino} y vuelve a tirar." },
      A_BEBER: { title: "¡Ronda de mezcal!" },
    });
    expect(old).toEqual({});
    // el texto del tropiezo con «3 vasos» que quedó guardado ya no cuenta: ahora son siempre 2
    expect(parseCardOverrides({ PATINAZO: { text: "{nombre} tropieza con una lápida. Para no caerse elige: bebe 3 vasos de golpe o vuelva hasta la casilla {casilla}." } })).toEqual({});
    const edited = parseCardOverrides({ OCA: { text: "Mi texto propio {nombre}" } });
    expect(edited.OCA?.text).toBe("Mi texto propio {nombre}");
  });
});

describe("Duelo: a cuántos rivales se puede retar", () => {
  it("nunca más que los rivales que hay en la mesa", () => {
    const dos = createGame([{ name: "Ana", color: "#fff" }, { name: "Beto", color: "#000" }]);
    expect(tileRule(47, dos, "p1").text).toContain("reta hasta a 1 rival.");
    const cuatro = createGame(["A", "B", "C", "D", "E"].map((name) => ({ name, color: "#fff" })));
    expect(tileRule(47, cuatro, "p1").text).toContain("reta hasta a 4 rivales.");
    expect(tileRule(19, cuatro, "p1").text).toContain("reta hasta a 2 rivales.");
  });
});

describe("grupos del editor de tarjetas", () => {
  it("cada tarjeta cae en un grupo y cada tipo de casilla está en uno", () => {
    const ids = new Set(CARD_GROUPS.map((g) => g.id));
    for (const c of cardCatalog()) expect(ids.has(groupOf(c))).toBe(true);
    const tipos = new Set(cardCatalog().filter((c) => c.tiles.length).map((c) => c.key.split(":")[0]));
    const cubiertos = new Set(CARD_GROUPS.flatMap((g) => g.types as readonly string[]));
    for (const t of tipos) expect(cubiertos.has(t)).toBe(true);
  });
});

describe("editor: datos fijos dentro del texto", () => {
  const def = (key: string) => cardCatalog().find((c) => c.key === key)!;
  it("lo que siempre vale lo mismo se enseña escrito; lo que cambia en cada partida, entre llaves", () => {
    expect(staticCardVars(def("RASGO"))).toEqual({}); // la carta cambia en cada partida
    expect(staticCardVars(def("POSICION:Pa' los de atrás"))).toMatchObject({ vasos: "1 vaso", lado: "por detrás" });
    expect(Object.keys(staticCardVars(def("POSICION:Pa' los de atrás")))).not.toContain("nombre");
    expect(staticCardVars(def("OCA"))).toEqual({}); // el destino cambia según la casilla
    expect(staticCardVars(def("PATINAZO"))).toEqual({ vasos: "2 vasos" }); // la casilla a la que rueda cambia
    expect(staticCardVars(def("A_BEBER"))).toEqual({}); // los vasos son al azar
    expect(staticCardVars(def("RESULTADO:duelo"))).toEqual({});
  });
});

