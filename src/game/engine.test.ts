import { BOARD } from "./board";
import { describe, expect, it } from "vitest";
import { applyAction, createGame, type Action, type GameState, type Rng } from "./engine";
import { setCategories, DEFAULT_CATEGORIES, setNicknames, DEFAULT_NICKNAMES, setTwisters, DEFAULT_TWISTERS, setNunca, DEFAULT_NUNCA, setJuicio, DEFAULT_JUICIO, setRonda, DEFAULT_RONDA, setRetos, DEFAULT_RETOS, setReflejos, DEFAULT_REFLEJOS } from "./content";
import { tileRule } from "./rules";

/** Rng que produce exactamente los dados indicados (1-6), en orden. */
function dice(...values: number[]): Rng {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error("Se acabaron los dados del test");
    return (values[i++] - 1) / 6 + 0.01;
  };
}

function game(n = 3): GameState {
  return createGame(
    Array.from({ length: n }, (_, i) => ({ name: ["Ana", "Beto", "Caro", "Dani"][i], color: "#fff" })),
  );
}

/** Coloca al jugador actual en `pos` y tira `roll`. */
function rollFrom(s: GameState, pos: number, roll: number, ...extra: number[]): GameState {
  const t = structuredClone(s);
  t.players[t.turn].pos = pos;
  return applyAction(t, { type: "ROLL" }, dice(roll, ...extra));
}

const act = (s: GameState, a: Action, ...d: number[]) => applyAction(s, a, dice(...d));

describe("movimiento", () => {
  it("avanza y pasa el turno en una casilla sin efecto", () => {
    const s = rollFrom(game(), 1, 2, 1); // 3 = Juicio de los vivos -> decisión
    expect(s.players[0].pos).toBe(3);
    expect(s.decision?.kind).toBe("SELECT_DRINKERS");
  });

  it("rebota si se pasa de la 62", () => {
    const s = rollFrom(game(), 59, 6, 1); // 65 -> 59
    expect(s.players[0].pos).toBe(59);
  });

  it("gana al llegar exacto a la 62", () => {
    const s = rollFrom(game(), 58, 4);
    expect(s.phase).toBe("FINISHED");
    expect(s.winner).toBe("p1");
    expect(applyAction(s, { type: "ROLL" })).toBe(s);
  });

  it("no hace nada si la acción no corresponde a la fase", () => {
    const s = game();
    expect(applyAction(s, { type: "SET_RULE" })).toBe(s);
  });
});

describe("casillas", () => {
  it("Oca: si bebe 1, salta a la siguiente y vuelve a tirar", () => {
    let s = rollFrom(game(), 4, 4); // 8
    s = act(s, { type: "OCA", choice: "fly" });
    expect(s.players[0].pos).toBe(18);
    expect(s.players[0].drunk).toBe(1);
    expect(s.turn).toBe(0);
    expect(s.phase).toBe("ROLL");
  });

  it("Muerte: vuelve a la salida", () => {
    const s = rollFrom(game(), 57, 3);
    expect(s.players[0].pos).toBe(1);
    expect(s.turn).toBe(1);
  });

  it("Trago de regalo: reparte de 1 a 3 vasos al azar, exactamente la cantidad", () => {
    for (const [die, amount] of [[1, 1], [3, 2], [6, 3]] as const) {
      const s = rollFrom(game(), 4, 2, die); // casilla 6
      expect(s.decision).toEqual({ kind: "DISTRIBUTE", amount });
      expect(s.giftAmount).toBe(amount);
    }
    let s = rollFrom(game(), 4, 2, 1); // 1 vaso
    expect(act(s, { type: "DISTRIBUTE", drinks: { p2: 2 } })).toBe(s);
    s = act(s, { type: "DISTRIBUTE", drinks: { p2: 1 } });
    expect(s.players[1].drunk).toBe(1);
    expect(s.turn).toBe(1);
  });

  it("Duelo: cada dado se tira a mano, el que saca menos bebe y los empates se repiten", () => {
    let s = rollFrom(game(), 17, 2); // 19, hasta 2 rivales
    s = act(s, { type: "DUEL", opponents: ["p2"] });
    expect(s.decision).toMatchObject({ kind: "DUEL_ROLL", i: 0, a: null, b: null });
    expect(s.turn).toBe(0); // no se resuelve solo
    s = act(s, { type: "DUEL_ROLL" }, 3); // tira quien reta
    expect(s.decision).toMatchObject({ a: 3, b: null });
    expect(s.lastRoller).toBe("p1");
    s = act(s, { type: "DUEL_ROLL" }, 3); // tira el rival: empate
    expect(s.decision).toMatchObject({ a: 3, b: 3, tie: true });
    expect(s.lastRoller).toBe("p2");
    s = act(s, { type: "DUEL_ROLL" }, 2); // otra ronda
    s = act(s, { type: "DUEL_ROLL" }, 5);
    expect(s.players[0].drunk).toBe(1);
    expect(s.players[1].drunk).toBe(0);
    expect(s.turn).toBe(1);
    // El resultado queda guardado para enseñarlo en la TV y el celular.
    expect(s.lastDuel).toEqual({ seq: 1, by: "p1", rounds: [{ rival: "p2", a: 2, b: 5, loser: "p1" }] });
  });

  it("Duelo con dos rivales: se juega una ronda por rival", () => {
    let s = rollFrom(game(), 17, 2); // 19: duelo de hasta 2 rivales
    s = act(s, { type: "DUEL", opponents: ["p2", "p3"] });
    for (const r of [6, 1, 2, 4]) s = act(s, { type: "DUEL_ROLL" }, r);
    expect(s.lastDuel?.rounds).toEqual([
      { rival: "p2", a: 6, b: 1, loser: "p2" },
      { rival: "p3", a: 2, b: 4, loser: "p1" },
    ]);
  });

  it("Duelo: no puede retar a más rivales de los permitidos", () => {
    const s = rollFrom(game(4), 17, 2); // 19: como mucho 2 rivales
    expect(act(s, { type: "DUEL", opponents: ["p2", "p3", "p4"] })).toBe(s);
  });

  it("Laberinto: falla con menos de 5 y sale con 5 o 6", () => {
    // ya no hay casillas de Panteón en Niebla en el tablero, pero el motor sigue entendiendo el estado
    let s = game(1);
    s.players[0].status.laberinto = true;
    s.players[0].pos = 9;
    s = act(s, { type: "ROLL" }, 3);
    expect(s.players[0].drunk).toBe(1);
    expect(s.players[0].pos).toBe(9);
    s = act(s, { type: "ROLL" }, 5);
    expect(s.players[0].status.laberinto).toBe(false);
  });

  it("Cárcel: en su turno tira; con 1-3 debe 2, con 4-6 debe 4; si paga todo sale y vuelve a tirar", () => {
    let s = rollFrom(game(2), 22, 4); // Ana cae en 26
    expect(s.players[0].status.carcel).toEqual({ at: 26 });
    expect(s.turn).toBe(1);
    s = rollFrom(s, 1, 1, 1); // Beto 2 (Juicio de los vivos)
    s = act(s, { type: "SELECT_DRINKERS", ids: [] });
    expect(s.phase).toBe("ROLL");
    s = act(s, { type: "ROLL" }, 3); // Ana saca 3: debe 2
    expect(s.decision).toEqual({ kind: "JAIL_PAY", owed: 2, roll: 3 });
    expect(s.players[0].drunk).toBe(0);
    s = act(s, { type: "JAIL_PAY", n: 2 }); // paga los 2 y sale
    expect(s.players[0].drunk).toBe(2);
    expect(s.lastJail).toMatchObject({ by: "p1", paid: 2, left: 0 });
    expect(s.players[0].status.carcel).toBeNull();
    expect(s.players[0].pos).toBe(26);
    expect(s.turn).toBe(0);
    expect(s.phase).toBe("ROLL");
    s = act(s, { type: "ROLL" }, 1, 1); // ahora avanza (cae en un reto)
    expect(s.players[0].pos).toBe(27);
  });

  it("Cárcel: con 4 o más la fianza es de 4 vasos; caer en la celda de otro lo libera", () => {
    let s = rollFrom(game(2), 22, 4); // Ana 26
    s = rollFrom(s, 20, 6); // Beto también 26: Ana libre
    expect(s.players[0].status.carcel).toBeNull();
    expect(s.players[1].status.carcel).toEqual({ at: 26 });
    s = rollFrom(s, 1, 1, 1); // Ana 2 (Juicio de los vivos)
    s = act(s, { type: "SELECT_DRINKERS", ids: [] });
    s = act(s, { type: "ROLL" }, 5); // Beto saca 5: debe 4
    s = act(s, { type: "JAIL_PAY", n: 4 });
    expect(s.players[1].drunk).toBe(4);
    expect(s.players[1].status.carcel).toBeNull();
  });

  it("Cárcel: puede pagar solo una parte y queda debiendo el resto para su próximo turno", () => {
    let s = rollFrom(game(2), 22, 4); // Ana 26
    s = rollFrom(s, 1, 1, 1); // Beto 2 (Juicio de los vivos)
    s = act(s, { type: "SELECT_DRINKERS", ids: [] });
    s = act(s, { type: "ROLL" }, 6); // Ana debe 4
    expect(s.decision).toEqual({ kind: "JAIL_PAY", owed: 4, roll: 6 });
    expect(act(s, { type: "JAIL_PAY", n: 0 })).toBe(s); // no vale pagar 0
    expect(act(s, { type: "JAIL_PAY", n: 5 })).toBe(s); // ni más de lo que debe
    s = act(s, { type: "JAIL_PAY", n: 1 }); // paga 1: debe 3
    expect(s.players[0].drunk).toBe(1);
    expect(s.players[0].status.carcel).toEqual({ at: 26, debt: 3 });
    expect(s.lastJail).toMatchObject({ paid: 1, left: 3 });
    expect(s.turn).toBe(1); // pasa el turno
    s = rollFrom(s, 2, 1, 1); // Beto 3 (Juicio de los vivos)
    s = act(s, { type: "SELECT_DRINKERS", ids: [] });
    // su siguiente turno ya no tira: paga lo que debe
    s = act(s, { type: "ROLL" }, 4);
    expect(s.decision).toEqual({ kind: "JAIL_PAY", owed: 3, roll: null });
    expect(s.players[0].pos).toBe(26);
    s = act(s, { type: "JAIL_PAY", n: 1 }); // paga 1 más: debe 2
    expect(s.players[0].status.carcel).toEqual({ at: 26, debt: 2 });
    s = rollFrom(s, 3, 1); // Beto 4
    s = act(s, { type: "SELECT_DRINKERS", ids: [] });
    s = act(s, { type: "ROLL" }, 4); // vuelve a su turno con deuda
    s = act(s, { type: "JAIL_PAY", n: 2 }); // paga el resto y sale
    expect(s.players[0].drunk).toBe(4); // 1 + 1 + 2
    expect(s.players[0].status.carcel).toBeNull();
    expect(s.lastJail).toMatchObject({ paid: 2, left: 0 });
    expect(s.turn).toBe(0); // vuelve a tirar para avanzar
    expect(s.phase).toBe("ROLL");
  });

  it("Patinazo: beber de golpe o retroceder", () => {
    const s = rollFrom(game(), 40, 3); // 43
    expect(act(s, { type: "PATINAZO", choice: "drink" }).players[0].drunk).toBe(2); // siempre 2 vasos
    expect(act(s, { type: "PATINAZO", choice: "back" }).players[0].pos).toBe(12);
  });

  it("Patinazo: una decisión guardada antes con otro número de vasos también cuesta 2", () => {
    const s = rollFrom(game(), 40, 3);
    const viejo = { ...s, decision: { kind: "PATINAZO" as const, drinks: 4, backTo: 12 } };
    expect(act(viejo, { type: "PATINAZO", choice: "drink" }).players[0].drunk).toBe(2);
  });

  it("Regla: queda activa y se puede penalizar a quien la rompa", () => {
    let s = rollFrom(game(), 8, 2); // 10
    s = act(s, { type: "SET_RULE" });
    expect(s.rule).not.toBeNull();
    s = act(s, { type: "PENALTY", id: "p3" });
    expect(s.players[2].drunk).toBe(1);
  });
});

describe("estados", () => {
  it("Estación Abstemia: inmune a lo que mandan otros", () => {
    let s = rollFrom(game(), 1, 3); // Ana en 4
    expect(s.players[0].status.inmune).toBe(true);
    s = rollFrom(s, 3, 3, 1); // Beto en 6, x1
    expect(act(s, { type: "DISTRIBUTE", drinks: { p1: 1 } }).players[0].drunk).toBe(0);
  });

  it("La inmunidad termina al empezar su siguiente turno", () => {
    let s = rollFrom(game(2), 1, 3); // Ana en 4
    s = rollFrom(s, 1, 1, 1); // Beto 2 -> Juicio de los vivos
    s = act(s, { type: "SELECT_DRINKERS", ids: [] });
    expect(s.players[0].status.inmune).toBe(false);
  });

  it("Abducción mental: el hipnotizado absorbe la mitad", () => {
    let s = rollFrom(game(), 14, 3); // Ana en 17
    s = rollFrom(s, 28, 2, 3); // Beto en 30 (Trago de regalo), regala 2
    s = act(s, { type: "DISTRIBUTE", drinks: { p3: 2 } });
    expect(s.players[0].drunk).toBe(1);
    expect(s.players[2].drunk).toBe(1);
  });

  it("Esclavo: bebe cada vez que bebe su amo", () => {
    let s = rollFrom(game(), 21, 3); // 24
    s = act(s, { type: "CHOOSE_SLAVE", id: "p2" });
    s = act(s, { type: "PENALTY", id: "p1" });
    expect(s.players[0].drunk).toBe(1);
    expect(s.players[1].drunk).toBe(1);
  });
});

describe("retos, género y deudas", () => {
  const withGender = () =>
    createGame([
      { name: "Ana", color: "#fff", gender: "mujer" },
      { name: "Beto", color: "#fff", gender: "hombre" },
      { name: "Caro", color: "#fff", gender: "mujer" },
    ]);

  it("Juicio de los vivos saca una carta distinta de la lista y quien controla la mesa marca quiénes beben", () => {
    setJuicio(["Todos los de prueba beben.", "Votad por el más chistoso; esa persona bebe."]);
    try {
      let s = rollFrom(withGender(), 1, 2, 4); // 3 -> sale la segunda carta
      expect(s.juicio).toBe("Votad por el más chistoso; esa persona bebe.");
      expect(s.decision).toMatchObject({ kind: "SELECT_DRINKERS", title: "Juicio de los vivos", drinks: 1, text: "Votad por el más chistoso; esa persona bebe." });
      s = act(s, { type: "SELECT_DRINKERS", ids: ["p2", "p3"] });
      expect(s.players.map((p) => p.drunk)).toEqual([0, 1, 1]);
    } finally {
      setJuicio(DEFAULT_JUICIO);
    }
  });

  it("el Examen de Humanología propone una categoría", () => {
    const cultural = rollFrom(game(), 11, 2, 1); // 13
    expect(cultural.decision).toMatchObject({ text: expect.stringContaining("Categoría:") });
  });

  it("lo bebido queda como deuda hasta confirmar ¡Bebido!", () => {
    let s = rollFrom(game(), 4, 4); // Oca: bebe 1
    s = act(s, { type: "OCA", choice: "fly" });
    expect(s.players[0].pending).toBe(1);
    s = act(s, { type: "DRANK", id: "p1" });
    expect(s.players[0].pending).toBe(0);
    expect(s.players[0].drunk).toBe(1);
    expect(act(s, { type: "DRANK", id: "p1" })).toBe(s);
  });
});

describe("La Ouija", () => {
  it("saca una categoría al azar de las vigentes y la tarjeta la enseña", () => {
    setCategories(["frutas", "cócteles", "animales"]);
    try {
      const s = rollFrom(game(), 10, 3, 4); // 13: La Ouija; el 2.º dado elige (4 -> 2.ª posición)
      expect(s.category).toBe("cócteles");
      expect(tileRule(13, s, "p1").text).toContain("cócteles");
    } finally {
      setCategories(DEFAULT_CATEGORIES);
    }
  });
});

describe("Murciélago", () => {
  it("pregunta: si bebe, vuela al siguiente murciélago y vuelve a tirar", () => {
    let s = rollFrom(game(), 6, 2); // 8
    expect(s.decision).toEqual({ kind: "OCA", next: 18 });
    s = act(s, { type: "OCA", choice: "fly" });
    expect(s.players[0].pos).toBe(18);
    expect(s.players[0].drunk).toBe(1);
    expect(s.turn).toBe(0);
    expect(s.phase).toBe("ROLL");
  });

  it("si se planta, no bebe, se queda y pasa el turno", () => {
    let s = rollFrom(game(), 6, 2);
    s = act(s, { type: "OCA", choice: "stay" });
    expect(s.players[0].pos).toBe(8);
    expect(s.players[0].drunk).toBe(0);
    expect(s.turn).toBe(1);
  });
});

describe("Siguiente turno", () => {
  it("al terminar una jugada la TV espera; NEXT_TURN la libera (y solo vale una vez)", () => {
    let s = rollFrom(game(), 1, 3); // 4: La Capilla, sin decisión
    expect(s.waiting).toBe(true);
    s = act(s, { type: "NEXT_TURN" });
    expect(s.waiting).toBe(false);
    expect(act(s, { type: "NEXT_TURN" })).toBe(s);
  });

  it("tirar también libera la espera", () => {
    let s = rollFrom(game(), 1, 3);
    expect(s.waiting).toBe(true);
    s = act(s, { type: "ROLL" }, 1, 1); // tira sin esperar el botón
    expect(s.waiting).toBe(false);
  });

  it("Clasificatoria: solo al terminar la partida, y se puede abrir y cerrar", () => {
    expect(act(game(2), { type: "RANKING", on: true }).ranking).toBeUndefined(); // sin ganador no vale
    let s = rollFrom(game(2), 59, 3); // Ana llega a la 62 y gana
    expect(s.phase).toBe("FINISHED");
    s = act(s, { type: "RANKING", on: true });
    expect(s.ranking).toBe(true);
    s = act(s, { type: "RANKING", on: false });
    expect(s.ranking).toBe(false);
  });
});

describe("+ Trago, apodos y trabalenguas editables", () => {
  it("ADD_DRINK suma vasos a cualquier jugador sin cambiar el turno", () => {
    const g = game();
    const s = act(g, { type: "ADD_DRINK", id: "p2" });
    expect(s.players[1].drunk).toBe(1);
    expect(s.players[1].pending).toBe(1);
    expect(s.turn).toBe(g.turn);
    expect(s.phase).toBe(g.phase);
    expect(act(g, { type: "ADD_DRINK", id: "nadie" })).toBe(g);
  });

  it("la casilla Nuevo apodo saca uno de la lista vigente y lo pone en la decisión", () => {
    setNicknames(["Pelusa"]);
    try {
      const s = rollFrom(game(), 12, 2, 1); // 14
      expect(s.nickname).toBe("Pelusa");
      expect(s.decision).toMatchObject({ kind: "SELECT_DRINKERS", text: expect.stringContaining("Pelusa") });
    } finally {
      setNicknames(DEFAULT_NICKNAMES);
    }
  });

  it("un reto con {trabalenguas} usa los trabalenguas vigentes", () => {
    setTwisters(["Mi trabalenguas propio"]);
    setRetos(["Recita: {trabalenguas} Quien falle bebe 2 vasos."]);
    try {
      const s = rollFrom(game(), 56, 5, 1, 1); // 61
      expect(s.decision).toMatchObject({ kind: "SELECT_DRINKERS", drinks: 2, text: "Recita: «Mi trabalenguas propio» Quien falle bebe 2 vasos." });
    } finally {
      setTwisters(DEFAULT_TWISTERS);
      setRetos(DEFAULT_RETOS);
    }
  });

  it("Reto del Más Allá: sale uno de la lista y los vasos salen de su texto", () => {
    setRetos(["Todos tocan el piso.", "Quien haya ido al baño bebe 3 vasos."]);
    try {
      const sin = rollFrom(game(), 13, 2, 1); // 15 -> primer reto
      expect(sin.reto).toBe("Todos tocan el piso.");
      expect(sin.decision).toMatchObject({ drinks: 1, title: "Reto del Más Allá" });
      const con = rollFrom(game(), 13, 2, 4); // segundo reto
      expect(con.decision).toMatchObject({ drinks: 3, text: "Quien haya ido al baño bebe 3 vasos." });
    } finally {
      setRetos(DEFAULT_RETOS);
    }
  });
});

describe("Pacto de Sangre", () => {
  it("lo que bebe quien firma lo bebe también su pactado (se cuenta en su marcador) y dura una ronda", () => {
    let g = game();
    g.slave = { master: "p1", slave: "p2" };
    let s = act(g, { type: "ADD_DRINK", id: "p1" });
    expect(s.players.map((p) => p.drunk)).toEqual([1, 1, 0]);
    expect(s.players[1].pending).toBe(1);
    // quien no firmó bebe solo
    s = act(s, { type: "ADD_DRINK", id: "p3" });
    expect(s.players.map((p) => p.drunk)).toEqual([1, 1, 1]);
    // el pactado no arrastra al que firmó
    s = act(s, { type: "ADD_DRINK", id: "p2" });
    expect(s.players.map((p) => p.drunk)).toEqual([1, 2, 1]);
    // el pacto dura una ronda: sigue mientras juegan los demás y termina cuando el turno vuelve a quien lo firmó
    g = game();
    g.slave = { master: "p1", slave: "p2" };
    g.turn = 1;
    let t = rollFrom(g, 15, 2); // p2 cae en Poseído (17) y pasa el turno a p3
    expect(t.turn).toBe(2);
    expect(t.slave).not.toBeNull();
    t = rollFrom(t, 15, 2); // p3 también termina su turno: vuelve a p1
    expect(t.turn).toBe(0);
    expect(t.slave).toBeNull();
  });
});

describe("Yo nunca", () => {
  it("hay 3 casillas de Yo nunca y quedan 2 duelos", () => {
    expect(BOARD.filter((t) => t.type === "YO_NUNCA").map((t) => t.n)).toEqual([7, 29, 37]);
    expect(BOARD.filter((t) => t.type === "DUELO").map((t) => t.n)).toEqual([19, 47]);
  });

  it("es individual: quien cae dice si lo hizo y solo él bebe", () => {
    setNunca(["Yo nunca he probado la frase de prueba."]);
    try {
      const s = rollFrom(game(), 5, 2, 1); // 7
      expect(s.nunca).toBe("Yo nunca he probado la frase de prueba.");
      expect(s.decision).toEqual({ kind: "NUNCA" });
      const si = act(s, { type: "NUNCA", did: true });
      expect(si.players.map((p) => p.drunk)).toEqual([1, 0, 0]);
      expect(si.turn).toBe(1);
      const no = act(s, { type: "NUNCA", did: false });
      expect(no.players.map((p) => p.drunk)).toEqual([0, 0, 0]);
      expect(no.turn).toBe(1);
    } finally {
      setNunca(DEFAULT_NUNCA);
    }
  });
});

describe("Reto de ronda", () => {
  it("hay 2 casillas de Reto de ronda (25 y 52) y quedan 3 Ouijas", () => {
    expect(BOARD.filter((t) => t.type === "RONDA").map((t) => t.n)).toEqual([25, 52]);
    expect(BOARD.filter((t) => t.type === "CULTURAL").map((t) => t.n)).toEqual([13, 33, 39]);
  });

  it("al caer sale un reto, pasa el turno y dura hasta que el turno vuelve a quien lo sacó", () => {
    setRonda(["Nadie puede señalar con el dedo."]);
    try {
      let s = rollFrom(game(), 23, 2, 1); // p1 cae en 25
      expect(s.ronda).toEqual({ text: "Nadie puede señalar con el dedo.", by: "p1" });
      expect(s.turn).toBe(1);
      s = rollFrom(s, 15, 2); // p2 termina su turno en 17 (Poseído)
      expect(s.ronda).not.toBeNull();
      s = rollFrom(s, 15, 2); // p3 también: vuelve a p1
      expect(s.turn).toBe(0);
      expect(s.ronda).toBeNull();
    } finally {
      setRonda(DEFAULT_RONDA);
    }
  });
});

describe("Muerte Súbita", () => {
  it("hay 3 casillas (9, 35 y 59) y quedan 2 de Trago de regalo y ninguna de Panteón en Niebla", () => {
    expect(BOARD.filter((t) => t.type === "REFLEJO").map((t) => t.n)).toEqual([9, 35, 59]);
    expect(BOARD.filter((t) => t.type === "A_BEBER").map((t) => t.n)).toEqual([6, 30]);
    expect(BOARD.filter((t) => t.type === "LABERINTO")).toHaveLength(0);
  });

  it("al caer sale una carta de la lista y el celular marca quiénes beben", () => {
    setReflejos(["La última persona en aplaudir bebe.", "Todos los que lleven un anillo puesto beben."]);
    try {
      let s = rollFrom(game(), 7, 2, 4); // 9 -> segunda carta
      expect(s.reflejo).toBe("Todos los que lleven un anillo puesto beben.");
      expect(s.decision).toMatchObject({ kind: "SELECT_DRINKERS", title: "Muerte Súbita", drinks: 1 });
      s = act(s, { type: "SELECT_DRINKERS", ids: ["p2"] });
      expect(s.players.map((p) => p.drunk)).toEqual([0, 1, 0]);
    } finally {
      setReflejos(DEFAULT_REFLEJOS);
    }
  });
});
