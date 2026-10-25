import { describe, expect, it } from "vitest";
import { applyAction, createGame, type Action, type GameState, type Rng } from "./engine";

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
    const s = rollFrom(game(), 1, 2); // 3 = Cegatos -> decisión
    expect(s.players[0].pos).toBe(3);
    expect(s.decision?.kind).toBe("SELECT_DRINKERS");
  });

  it("rebota si se pasa de la 62", () => {
    const s = rollFrom(game(), 59, 6); // 65 -> 59
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
    expect(applyAction(s, { type: "SET_RULE", text: "x" })).toBe(s);
  });
});

describe("casillas", () => {
  it("Oca: bebe 1, salta a la siguiente y vuelve a tirar", () => {
    const s = rollFrom(game(), 4, 4); // 8
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

  it("Pa' los de atrás: beben los que están detrás", () => {
    let s = game();
    s.players[1].pos = 5;
    s.players[2].pos = 20;
    s = rollFrom(s, 10, 2); // 12
    expect(s.players[1].drunk).toBe(1);
    expect(s.players[2].drunk).toBe(0);
  });

  it("A beber: reparte exactamente la cantidad indicada", () => {
    let s = rollFrom(game(), 4, 2); // 6, x1
    expect(s.decision).toEqual({ kind: "DISTRIBUTE", amount: 1 });
    expect(act(s, { type: "DISTRIBUTE", drinks: { p2: 2 } })).toBe(s);
    s = act(s, { type: "DISTRIBUTE", drinks: { p2: 1 } });
    expect(s.players[1].drunk).toBe(1);
    expect(s.turn).toBe(1);
  });

  it("Duelo: el que saca menos bebe y los empates se repiten", () => {
    let s = rollFrom(game(), 5, 2); // 7, x1
    s = act(s, { type: "DUEL", opponents: ["p2"] }, 3, 3, 2, 5);
    expect(s.players[0].drunk).toBe(1);
    expect(s.players[1].drunk).toBe(0);
  });

  it("Duelo: no puede retar a más rivales de los permitidos", () => {
    const s = rollFrom(game(), 5, 2);
    expect(act(s, { type: "DUEL", opponents: ["p2", "p3"] })).toBe(s);
  });

  it("Laberinto: falla con menos de 5 y sale con 5 o 6", () => {
    let s = game(1);
    s = rollFrom(s, 5, 4); // 9
    expect(s.players[0].status.laberinto).toBe(true);
    s = act(s, { type: "ROLL" }, 3);
    expect(s.players[0].drunk).toBe(1);
    expect(s.players[0].pos).toBe(9);
    s = act(s, { type: "ROLL" }, 5);
    expect(s.players[0].status.laberinto).toBe(false);
  });

  it("Cárcel: fianza de 2 dados, pagar o esperar, y libera al caer otro", () => {
    let s = rollFrom(game(2), 22, 4, 3, 4); // 26, fianza 7
    expect(s.players[0].status.carcel).toEqual({ bail: 7, at: 26 });
    s = rollFrom(s, 20, 6, 1, 1); // Beto cae en 26
    expect(s.players[0].status.carcel).toBeNull();
    expect(s.players[1].status.carcel?.bail).toBe(2);
    s = rollFrom(s, 1, 1); // Ana 2
    s = act(s, { type: "SELECT_DRINKERS", ids: [] });
    expect(s.decision).toEqual({ kind: "CARCEL", bail: 2 });
    s = act(s, { type: "CARCEL", choice: "pay" });
    expect(s.players[1].drunk).toBe(2);
    expect(s.phase).toBe("ROLL");
    expect(s.turn).toBe(1);
  });

  it("Patinazo: beber de golpe o retroceder", () => {
    const s = rollFrom(game(), 40, 3); // 43
    expect(act(s, { type: "PATINAZO", choice: "drink" }).players[0].drunk).toBe(4);
    expect(act(s, { type: "PATINAZO", choice: "back" }).players[0].pos).toBe(12);
  });

  it("Regla: queda activa y se puede penalizar a quien la rompa", () => {
    let s = rollFrom(game(), 8, 2); // 10
    expect(act(s, { type: "SET_RULE", text: "  " })).toBe(s);
    s = act(s, { type: "SET_RULE", text: "Prohibido decir beber" });
    expect(s.rule?.text).toBe("Prohibido decir beber");
    s = act(s, { type: "PENALTY", id: "p3" });
    expect(s.players[2].drunk).toBe(1);
  });
});

describe("estados", () => {
  it("Estación Abstemia: inmune a lo que mandan otros", () => {
    let s = rollFrom(game(), 1, 3); // Ana en 4
    expect(s.players[0].status.inmune).toBe(true);
    s = rollFrom(s, 3, 3); // Beto en 6, x1
    expect(act(s, { type: "DISTRIBUTE", drinks: { p1: 1 } }).players[0].drunk).toBe(0);
  });

  it("La inmunidad termina al empezar su siguiente turno", () => {
    let s = rollFrom(game(2), 1, 3); // Ana en 4
    s = rollFrom(s, 1, 1); // Beto 2 -> Machos
    s = act(s, { type: "SELECT_DRINKERS", ids: [] });
    expect(s.players[0].status.inmune).toBe(false);
  });

  it("Abducción mental: el hipnotizado absorbe la mitad", () => {
    let s = rollFrom(game(), 14, 3); // Ana en 17
    s = rollFrom(s, 12, 2); // Beto en 14, x2
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
