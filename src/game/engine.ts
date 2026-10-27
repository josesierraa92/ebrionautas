// Motor de reglas: función pura applyAction(state, action, rng) -> nuevo estado.
// No toca la UI ni la red; la Fase 2 lo ejecutará en el servidor.

import type { AvatarConfig } from "./avatar";
import { BOARD, TILE_NAMES, TRAIT_LABELS, getTile } from "./board";
import { CATEGORIES, TONGUE_TWISTERS, pick } from "./content";

export const LAST_TILE = BOARD.length;

export type PlayerStatus = {
  inmune: boolean; // Estación Abstemia: nadie le puede mandar beber
  hipnosis: boolean; // Abducción mental: absorbe la mitad de lo que beben los demás
  laberinto: boolean; // Panteón en Niebla: sale con 5 o 6
  carcel: { at: number } | null; // en su turno tira: con 1-3 bebe 2 y sale, con 4-6 bebe 4 y sale
};

export type Gender = "hombre" | "mujer";

export type Player = {
  id: string;
  name: string;
  color: string;
  avatar?: AvatarConfig;
  gender?: Gender; // las casillas "Machos" y "Hembras" se resuelven solas con esto
  pos: number;
  drunk: number; // total bebido en la partida
  pending: number; // vasos que debe y aún no ha confirmado con "¡Bebido!"
  status: PlayerStatus;
};

export type Decision =
  | { kind: "DISTRIBUTE"; amount: number }
  | { kind: "DUEL"; amount: number }
  | { kind: "PATINAZO"; drinks: number; backTo: number }
  | { kind: "RULE" }
  // Quien controla la mesa marca quiénes beben.
  | { kind: "SELECT_DRINKERS"; drinks: number; title: string; text: string }
  | { kind: "SLAVE" }

export type LogEntry = { id: number; text: string };

export type GameState = {
  players: Player[];
  turn: number;
  phase: "ROLL" | "DECISION" | "FINISHED";
  decision: Decision | null;
  decisionSeq: number; // sube con cada decisión nueva; la UI lo usa para reiniciar su panel
  rule: { text: string; by: string } | null;
  slave: { master: string; slave: string } | null;
  lastRoll: number | null;
  lastRoller?: string | null; // id de quien hizo la última tirada
  rollSeq: number; // sube con cada tirada (aunque salga el mismo número): la TV anima el dado
  extraRoll: boolean;
  /** Último duelo resuelto (los dados se tiran en el servidor): la TV y el celular enseñan el resultado. */
  lastDuel?: { seq: number; by: string; rounds: { rival: string; a: number; b: number; loser: string }[] } | null;
  winner: string | null;
  log: LogEntry[];
  logSeq: number;
};

export type Action =
  | { type: "ROLL" }
  | { type: "DISTRIBUTE"; drinks: Record<string, number> }
  | { type: "DUEL"; opponents: string[] }
  | { type: "PATINAZO"; choice: "drink" | "back" }
  | { type: "SET_RULE"; text: string }
  | { type: "SELECT_DRINKERS"; ids: string[] }
  | { type: "CHOOSE_SLAVE"; id: string }
  | { type: "DRANK"; id: string }
  | { type: "PENALTY"; id: string };

export type Rng = () => number;

const MAX_LOG = 60;

const d6 = (rng: Rng) => Math.floor(rng() * 6) + 1;

export function createGame(players: { name: string; color: string; avatar?: AvatarConfig; gender?: Gender }[]): GameState {
  const state: GameState = {
    players: players.map((p, i) => ({
      id: `p${i + 1}`,
      name: p.name,
      color: p.color,
      avatar: p.avatar,
      gender: p.gender,
      pos: 1,
      drunk: 0,
      pending: 0,
      status: { inmune: false, hipnosis: false, laberinto: false, carcel: null },
    })),
    turn: 0,
    phase: "ROLL",
    decision: null,
    decisionSeq: 0,
    rule: null,
    slave: null,
    lastRoll: null,
    lastRoller: null,
    rollSeq: 0,
    extraRoll: false,
    winner: null,
    log: [],
    logSeq: 0,
  };
  log(state, "🕛 ¡Es medianoche y los muertos salen de sus tumbas! Que empiece la fiesta.");
  return state;
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.turn];
}

export function applyAction(state: GameState, action: Action, rng: Rng = Math.random): GameState {
  if (action.type === "DRANK") {
    const target = state.players.find((p) => p.id === action.id);
    if (!target?.pending) return state;
    const s = structuredClone(state);
    const p = s.players.find((q) => q.id === action.id)!;
    log(s, `✅ ${p.name} se bebió ${p.pending} ${vasos(p.pending)}.`);
    p.pending = 0;
    return s;
  }

  if (state.phase === "FINISHED") return state;
  const s = structuredClone(state);

  if (action.type === "PENALTY") {
    const target = s.players.find((p) => p.id === action.id);
    if (!target) return state;
    log(s, `📜 ${target.name} rompió la Ley del Más Allá.`);
    drink(s, target.id, 1, null);
    return s;
  }

  if (action.type === "ROLL") {
    if (s.phase !== "ROLL") return state;
    roll(s, rng);
    return s;
  }

  if (s.phase !== "DECISION" || !s.decision) return state;
  return resolveDecision(s, action, rng) ? s : state;
}

// --- Turnos -----------------------------------------------------------------

function startTurn(s: GameState) {
  const p = currentPlayer(s);
  p.status.inmune = false;
  p.status.hipnosis = false;
  s.phase = "ROLL";
  s.decision = null;
}

function endTurn(s: GameState) {
  s.decision = null;
  if (s.extraRoll) {
    s.extraRoll = false;
    s.phase = "ROLL";
    return;
  }
  s.turn = (s.turn + 1) % s.players.length;
  startTurn(s);
}

function decide(s: GameState, decision: Decision) {
  s.decisionSeq = (s.decisionSeq ?? 0) + 1;
  s.phase = "DECISION";
  s.decision = decision;
}

/** Salida del Purgatorio: con 1-3 se beben 2 vasos, con 4-6 se beben 4. */
export function jailBail(roll: number): number {
  return roll <= 3 ? 2 : 4;
}

function roll(s: GameState, rng: Rng) {
  const p = currentPlayer(s);
  const r = d6(rng);
  s.lastRoll = r;
  s.lastRoller = p.id;
  s.rollSeq = (s.rollSeq ?? 0) + 1;

  if (p.status.carcel) {
    // Fianza según el dado; al pagarla sale y vuelve a tirar para avanzar.
    const bail = jailBail(r);
    p.status.carcel = null;
    log(s, `🔓 ${p.name} saca ${r}: bebe ${bail} ${vasos(bail)} y sale del Purgatorio. Ahora tira para avanzar.`);
    drink(s, p.id, bail, null);
    s.phase = "ROLL";
    return;
  }

  if (p.status.laberinto) {
    if (r >= 5) {
      p.status.laberinto = false;
      log(s, `🌫️ ${p.name} saca ${r} y encuentra la salida del Panteón en Niebla.`);
    } else {
      log(s, `🌫️ ${p.name} saca ${r}: sigue perdido en la niebla.`);
      drink(s, p.id, 1, null);
    }
    endTurn(s);
    return;
  }

  let to = p.pos + r;
  if (to > LAST_TILE) {
    to = LAST_TILE * 2 - to;
    log(s, `🎲 ${p.name} saca ${r}, se pasa de su tumba y rebota a la ${to}.`);
  } else {
    log(s, `🎲 ${p.name} saca ${r} y llega a la ${to}.`);
  }
  p.pos = to;
  landOn(s, p, rng);
}

function landOn(s: GameState, p: Player, rng: Rng) {
  const tile = getTile(p.pos);
  const others = s.players.filter((q) => q.id !== p.id);

  switch (tile.type) {
    case "SALIDA":
      return endTurn(s);

    case "META":
      s.winner = p.id;
      s.phase = "FINISHED";
      s.decision = null;
      log(s, `🏆 ¡${p.name} vuelve a su tumba antes del amanecer! Borracho, pero a tiempo: Leyenda del Más Allá. Reparte el resto de bebida como quiera.`);
      return;

    case "POSADA":
      p.status.inmune = true;
      log(s, `⛪ ${p.name} se refugia en La Capilla: nadie le puede mandar beber hasta su próximo turno.`);
      return endTurn(s);

    case "A_BEBER":
      log(s, `🥃 Ronda de mezcal: ${p.name} reparte ${tile.amount} ${vasos(tile.amount)}.`);
      return decide(s, { kind: "DISTRIBUTE", amount: tile.amount });

    case "DUELO":
      if (others.length === 0) return endTurn(s);
      log(s, `💀 Duelo de calaveras: ${p.name} reta hasta a ${Math.min(tile.amount, others.length)}.`);
      return decide(s, { kind: "DUEL", amount: Math.min(tile.amount, others.length) });

    case "OCA":
      log(s, `🦋 ¡De mariposa en mariposa y bebo porque me toca!`);
      drink(s, p.id, 1, null);
      if (tile.next) {
        p.pos = tile.next;
        log(s, `🦋 La mariposa monarca lleva a ${p.name} hasta la ${tile.next} y vuelve a tirar.`);
      } else {
        log(s, `🦋 ${p.name} vuelve a tirar.`);
      }
      s.extraRoll = true;
      return endTurn(s);

    case "LABERINTO":
      p.status.laberinto = true;
      log(s, `🌫️ ${p.name} se pierde en el Panteón en Niebla. Sale sacando 5 o 6.`);
      return endTurn(s);

    case "REGLA":
      log(s, `⚖️ ${p.name} dicta una nueva Ley del Más Allá.`);
      return decide(s, { kind: "RULE" });

    case "CULTURAL":
      return decide(s, {
        kind: "SELECT_DRINKERS",
        drinks: 1,
        title: TILE_NAMES.CULTURAL,
        text: `Categoría: "${pick(CATEGORIES, rng)}" (o ${p.name} elige otra). Por turnos decís una cada uno; quien se quede en blanco o repita, bebe.`,
      });

    case "HIPNOSIS":
      p.status.hipnosis = true;
      log(s, `👻 ${p.name} queda Poseído: hasta su próximo turno bebe la mitad de lo que beba el resto.`);
      return endTurn(s);

    case "CARCEL": {
      for (const q of others) {
        if (q.status.carcel?.at === tile.n) {
          q.status.carcel = null;
          log(s, `🔓 ${q.name} sale del Purgatorio: ${p.name} ocupa su lugar.`);
        }
      }
      p.status.carcel = { at: tile.n };
      log(s, `🔥 ${p.name} cae al Purgatorio. En su turno tira para ver cuánto bebe para salir.`);
      return endTurn(s);
    }

    case "MUERTE":
      p.pos = 1;
      log(s, `⚰️ ${p.name} cae en La Fosa y vuelve a medianoche (casilla 1).`);
      return endTurn(s);

    case "PATINAZO":
      log(s, `🪦 ${p.name} tropieza con una lápida.`);
      return decide(s, { kind: "PATINAZO", drinks: tile.drinks, backTo: tile.backTo });

    case "POSICION": {
      const targets = others.filter((q) => (tile.who === "detras" ? q.pos < p.pos : q.pos > p.pos));
      log(s, `👀 ${tile.title}: ${targets.length ? targets.map((q) => q.name).join(", ") : "nadie"} ${targets.length === 1 ? "bebe" : "beben"}.`);
      for (const q of targets) drink(s, q.id, tile.drinks, p.id);
      return endTurn(s);
    }

    case "RASGO": {
      const text = `Juicio de los vivos: beben ${tile.drinks} ${vasos(tile.drinks)} ${tile.traits.map((t) => TRAIT_LABELS[t]).join(" y ")}.`;
      // Machos / Hembras: el género de cada jugador ya se conoce, no hace falta preguntar.
      const byGender = tile.traits.every((t) => t === "hombre" || t === "mujer");
      if (byGender && s.players.every((q) => q.gender)) {
        const targets = s.players.filter((q) => tile.traits.includes(q.gender!));
        log(s, `💀 ${tile.title}: ${text.replace("Juicio de los vivos: ", "")}`);
        if (targets.length === 0) log(s, `${tile.title}: esta vez nadie bebe.`);
        for (const q of targets) drink(s, q.id, tile.drinks, q.id === p.id ? null : p.id);
        return endTurn(s);
      }
      return decide(s, { kind: "SELECT_DRINKERS", drinks: tile.drinks, title: tile.title, text });
    }

    case "RETO":
      return decide(s, {
        kind: "SELECT_DRINKERS",
        drinks: tile.drinks,
        title: tile.title,
        text: tile.twister ? `${tile.text} «${pick(TONGUE_TWISTERS, rng)}»` : tile.text,
      });

    case "ESCLAVO":
      if (others.length === 0) return endTurn(s);
      return decide(s, { kind: "SLAVE" });
  }
}

// --- Decisiones -------------------------------------------------------------

function resolveDecision(s: GameState, action: Action, rng: Rng): boolean {
  const p = currentPlayer(s);
  const d = s.decision!;
  const ids = new Set(s.players.map((q) => q.id));

  if (d.kind === "DISTRIBUTE" && action.type === "DISTRIBUTE") {
    const entries = Object.entries(action.drinks).filter(([, n]) => n > 0);
    const total = entries.reduce((a, [, n]) => a + n, 0);
    if (total !== d.amount || entries.some(([id, n]) => !ids.has(id) || !Number.isInteger(n))) return false;
    for (const [id, n] of entries) drink(s, id, n, p.id);
    endTurn(s);
    return true;
  }

  if (d.kind === "DUEL" && action.type === "DUEL") {
    const opps = [...new Set(action.opponents)];
    if (opps.length < 1 || opps.length > d.amount || opps.some((id) => id === p.id || !ids.has(id))) return false;
    const rounds: NonNullable<GameState["lastDuel"]>["rounds"] = [];
    for (const id of opps) {
      const rival = s.players.find((q) => q.id === id)!;
      let a = d6(rng);
      let b = d6(rng);
      while (a === b) {
        log(s, `💀 ${p.name} ${a} vs ${rival.name} ${b}: empate, otra vez.`);
        a = d6(rng);
        b = d6(rng);
      }
      const [winner, loser] = a > b ? [p, rival] : [rival, p];
      log(s, `💀 ${p.name} ${a} vs ${rival.name} ${b}: pierde ${loser.name}.`);
      drink(s, loser.id, 1, winner.id);
      rounds.push({ rival: rival.id, a, b, loser: loser.id });
    }
    s.lastDuel = { seq: (s.lastDuel?.seq ?? 0) + 1, by: p.id, rounds };
    endTurn(s);
    return true;
  }

  if (d.kind === "PATINAZO" && action.type === "PATINAZO") {
    if (action.choice === "drink") {
      log(s, `🪦 ${p.name} se agarra de la lápida bebiendo ${d.drinks} de golpe.`);
      drink(s, p.id, d.drinks, null);
    } else {
      p.pos = d.backTo;
      log(s, `🪦 ${p.name} rueda hasta la ${d.backTo}.`);
    }
    endTurn(s);
    return true;
  }

  if (d.kind === "RULE" && action.type === "SET_RULE") {
    const text = action.text.trim();
    if (!text) return false;
    s.rule = { text, by: p.id };
    log(s, `⚖️ Nueva ley de ${p.name}: "${text}"`);
    endTurn(s);
    return true;
  }

  if (d.kind === "SELECT_DRINKERS" && action.type === "SELECT_DRINKERS") {
    const chosen = [...new Set(action.ids)];
    if (chosen.some((id) => !ids.has(id))) return false;
    resolveDrinkers(s, chosen);
    return true;
  }

  if (d.kind === "SLAVE" && action.type === "CHOOSE_SLAVE") {
    if (action.id === p.id || !ids.has(action.id)) return false;
    s.slave = { master: p.id, slave: action.id };
    const slave = s.players.find((q) => q.id === action.id)!;
    log(s, `🩸 Pacto de Sangre: ${slave.name} beberá cada vez que ${p.name} beba.`);
    endTurn(s);
    return true;
  }

  return false;
}

function resolveDrinkers(s: GameState, chosen: string[]) {
  const p = currentPlayer(s);
  const d = s.decision as Extract<Decision, { kind: "SELECT_DRINKERS" }>;
  if (chosen.length === 0) log(s, `${d.title}: esta vez nadie bebe.`);
  for (const id of chosen) drink(s, id, d.drinks, id === p.id ? null : p.id);
  endTurn(s);
}

// --- Bebida -----------------------------------------------------------------

/** Aplica una bebida respetando La Capilla, Poseído y el Pacto de Sangre. */
function drink(s: GameState, targetId: string, n: number, sourceId: string | null) {
  if (n <= 0) return;
  const target = s.players.find((q) => q.id === targetId)!;

  if (sourceId && sourceId !== targetId && target.status.inmune) {
    log(s, `⛪ ${target.name} está en La Capilla: ¡inmune!`);
    return;
  }

  let own = n;
  const hypnotized = s.players.find((q) => q.status.hipnosis && q.id !== targetId);
  if (hypnotized) {
    const half = Math.ceil(n / 2);
    own = n - half;
    addDrinks(hypnotized, half);
    log(s, `👻 ${hypnotized.name} (poseído) absorbe ${half} ${vasos(half)} de ${target.name}.`);
  }
  if (own > 0) {
    addDrinks(target, own);
    log(s, `🍷 ${target.name} bebe ${own} ${vasos(own)}.`);
  }

  if (s.slave?.master === targetId) {
    const slave = s.players.find((q) => q.id === s.slave!.slave)!;
    addDrinks(slave, n);
    log(s, `🩸 ${slave.name}, por el Pacto de Sangre, bebe ${n} ${vasos(n)}.`);
  }
}

function addDrinks(p: Player, n: number) {
  p.drunk += n;
  p.pending = (p.pending ?? 0) + n; // ?? : partidas locales guardadas antes de existir `pending`
}

function vasos(n: number) {
  return n === 1 ? "vaso" : "vasos";
}

function log(s: GameState, text: string) {
  s.logSeq += 1;
  s.log = [{ id: s.logSeq, text }, ...s.log].slice(0, MAX_LOG);
}
