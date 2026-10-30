// Motor de reglas: función pura applyAction(state, action, rng) -> nuevo estado.
// No toca la UI ni la red; la Fase 2 lo ejecutará en el servidor.

import type { AvatarConfig } from "./avatar";
import { BOARD, NICKNAME_TEXT, PATINAZO_DRINKS, TILE_NAMES, getTile } from "./board";
import { drinksIn, getCategories, getJuicio, getNicknames, getNunca, getReflejos, getRetos, getRonda, getTwisters, pick } from "./content";

export const LAST_TILE = BOARD.length;

export type PlayerStatus = {
  inmune: boolean; // Estación Abstemia: nadie le puede mandar beber
  hipnosis: boolean; // Abducción mental: absorbe la mitad de lo que beben los demás
  // en su turno tira: con 1-3 debe 2 vasos, con 4-6 debe 4; puede pagar una parte y deber el resto (`debt`) para su próximo turno.
  // Sale cuando lo paga todo.
  carcel: { at: number; debt?: number } | null;
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
  // Duelo en marcha: los rivales ya están elegidos y cada uno tira su dado en el celular, uno a uno (primero quien
  // reta, luego el rival). `a`/`b` son los dados de la ronda actual (se quedan a la vista hasta la siguiente tirada).
  | { kind: "DUEL_ROLL"; rivals: string[]; i: number; a: number | null; b: number | null; tie: boolean; rounds: DuelRound[] }
  | { kind: "PATINAZO"; drinks: number; backTo: number }
  // Murciélago: quien cae elige si bebe 1 vaso para volar al siguiente murciélago (`next`; null en el último) y volver a tirar, o se planta.
  | { kind: "OCA"; next: number | null }
  | { kind: "RULE" }
  // Yo nunca (individual): quien cae dice si lo ha hecho; si sí, bebe 1 vaso.
  | { kind: "NUNCA" }
  // Quien controla la mesa marca quiénes beben.
  | { kind: "SELECT_DRINKERS"; drinks: number; title: string; text: string }
  | { kind: "SLAVE" }
  // Purgatorio: cuántos de los vasos que debe (`owed`) paga ahora; el resto queda de deuda para su próximo turno.
  // `roll`: lo que sacó al tirar (null si es un turno de pagar deuda, sin dado).
  | { kind: "JAIL_PAY"; owed: number; roll: number | null }

export type DuelRound = { rival: string; a: number; b: number; loser: string };

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
  /** Vasos del último trago de regalo (1 a 3, al azar): la tarjeta de la casilla los enseña. */
  giftAmount?: number | null;
  /** La jugada terminó y el celular aún no tocó «Siguiente turno»: la TV sigue enseñando a quien jugó (cámara y cuadro de turno). */
  waiting?: boolean;
  /** Categoría que salió en La Ouija (se queda hasta la siguiente). */
  category?: string | null;
  /** Apodo que salió en la casilla «Nuevo apodo» (se queda hasta el siguiente): quien se equivoque al llamarlo bebe. */
  nickname?: string | null;
  /** Frase que salió en «Yo nunca» (se queda hasta la siguiente). */
  nunca?: string | null;
  /** Carta que salió en «Juicio de los vivos» (se queda hasta la siguiente). */
  juicio?: string | null;
  /** Reto de ronda en marcha (casilla «Reto de ronda»): dura hasta que el turno vuelve a quien lo sacó. */
  ronda?: { text: string; by: string } | null;
  /** Reto que salió en «Reto del Más Allá» (se queda hasta el siguiente). */
  reto?: string | null;
  /** Carta que salió en «Muerte Súbita» (se queda hasta la siguiente). */
  reflejo?: string | null;
  rollSeq: number; // sube con cada tirada (aunque salga el mismo número): la TV anima el dado
  extraRoll: boolean;
  /** Último duelo resuelto (los dados se tiran en el servidor): la TV y el celular enseñan el resultado. */
  lastDuel?: { seq: number; by: string; rounds: DuelRound[] } | null;
  /** Último pago en el Purgatorio: cuánto pagó y cuánto le queda (0 = salió). La TV y el celular enseñan el resultado. */
  lastJail?: { seq: number; by: string; paid: number; left: number } | null;
  /** Terminada la partida: el celular abrió la clasificatoria, que se ve también en la TV en lugar del mensaje de ganador. */
  ranking?: boolean;
  winner: string | null;
  log: LogEntry[];
  logSeq: number;
};

export type Action =
  | { type: "ROLL" }
  | { type: "NEXT_TURN" }
  | { type: "DISTRIBUTE"; drinks: Record<string, number> }
  | { type: "DUEL"; opponents: string[] }
  | { type: "DUEL_ROLL" }
  | { type: "PATINAZO"; choice: "drink" | "back" }
  | { type: "OCA"; choice: "fly" | "stay" }
  | { type: "NUNCA"; did: boolean }
  | { type: "SET_RULE" }
  | { type: "SELECT_DRINKERS"; ids: string[] }
  | { type: "CHOOSE_SLAVE"; id: string }
  | { type: "JAIL_PAY"; n: number }
  | { type: "RANKING"; on: boolean }
  | { type: "DRANK"; id: string }
  | { type: "ADD_DRINK"; id: string; n?: number }
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
      status: { inmune: false, hipnosis: false, carcel: null },
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

  // «+ Trago» del celular: suma vasos a quien sea y cuando sea (p. ej. el apodo de la casilla «Nuevo apodo»), sin tocar el turno
  if (action.type === "ADD_DRINK") {
    if (state.phase === "FINISHED" || !state.players.some((p) => p.id === action.id)) return state;
    const n = Math.min(3, Math.max(1, Math.floor(action.n ?? 1)));
    const s = structuredClone(state);
    const who = s.players.find((p) => p.id === action.id)!;
    log(s, `➕ ${who.name} suma ${n} ${vasos(n)} a mano.`);
    drink(s, action.id, n, null);
    return s;
  }

  // Clasificatoria del final: solo cuando la partida terminó; se enseña en la TV y en el celular
  if (action.type === "RANKING") {
    if (state.phase !== "FINISHED" || !!state.ranking === !!action.on) return state;
    return { ...state, ranking: !!action.on };
  }

  if (state.phase === "FINISHED") return state;
  const s = structuredClone(state);

  // «Siguiente turno» en el celular: la TV pasa (cámara y cuadro) a quien tiene el turno
  if (action.type === "NEXT_TURN") {
    if (!state.waiting) return state;
    s.waiting = false;
    return s;
  }

  if (action.type === "PENALTY") {
    const target = s.players.find((p) => p.id === action.id);
    if (!target) return state;
    log(s, `📜 ${target.name} rompió la Ley del Más Allá.`);
    drink(s, target.id, 1, null);
    return s;
  }

  if (action.type === "ROLL") {
    if (s.phase !== "ROLL") return state;
    s.waiting = false;
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
  s.waiting = true;
  if (s.extraRoll) {
    s.extraRoll = false;
    s.phase = "ROLL";
    return;
  }
  s.turn = (s.turn + 1) % s.players.length;
  // el reto de ronda dura una ronda: termina cuando el turno vuelve a quien lo sacó
  if (s.ronda && s.players[s.turn].id === s.ronda.by) {
    log(s, `⏳ El reto de ronda de ${s.players[s.turn].name} terminó.`);
    s.ronda = null;
  }
  // el Pacto de Sangre dura una ronda: termina cuando el turno vuelve a quien lo firmó
  if (s.slave && s.players[s.turn].id === s.slave.master) {
    log(s, `🩸 El Pacto de Sangre de ${s.players[s.turn].name} terminó (duró una ronda).`);
    s.slave = null;
  }
  startTurn(s);
}

function decide(s: GameState, decision: Decision) {
  s.decisionSeq = (s.decisionSeq ?? 0) + 1;
  s.phase = "DECISION";
  s.decision = decision;
}

/** Penitencia del Purgatorio: con 1-3 se deben 2 vasos, con 4-6 se deben 4. */
export function jailBail(roll: number): number {
  return roll <= 3 ? 2 : 4;
}

function roll(s: GameState, rng: Rng) {
  const p = currentPlayer(s);
  // Purgatorio con deuda: este turno no se tira, se paga lo que debe (todo o una parte)
  const debt = p.status.carcel?.debt ?? 0;
  if (debt > 0) {
    log(s, `🔥 ${p.name} debe ${debt} ${vasos(debt)} del Purgatorio.`);
    decide(s, { kind: "JAIL_PAY", owed: debt, roll: null });
    return;
  }
  const r = d6(rng);
  s.lastRoll = r;
  s.lastRoller = p.id;
  s.rollSeq = (s.rollSeq ?? 0) + 1;

  if (p.status.carcel) {
    // Penitencia según el dado: elige cuántos vasos paga ya (JAIL_PAY); al pagarlo todo sale y vuelve a tirar para avanzar.
    const bail = jailBail(r);
    log(s, `🔥 ${p.name} saca ${r}: debe ${bail} ${vasos(bail)} para salir del Purgatorio.`);
    decide(s, { kind: "JAIL_PAY", owed: bail, roll: r });
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

    case "REFLEJO": {
      // Muerte Súbita: «la última persona en…» o «todos los que lleven…»; el celular marca quiénes beben
      const frase = pick(getReflejos(), rng);
      s.reflejo = frase; // la tarjeta de la casilla la enseña ({frase})
      log(s, `⏱️ Muerte Súbita: ${frase}`);
      return decide(s, { kind: "SELECT_DRINKERS", drinks: 1, title: TILE_NAMES.REFLEJO, text: frase });
    }

    case "RONDA": {
      const text = pick(getRonda(), rng);
      s.ronda = { text, by: p.id }; // la tarjeta lo enseña ({frase}) y el marcador lo recuerda hasta que acabe la ronda
      log(s, `⏳ Reto de ronda de ${p.name}: ${text}`);
      return endTurn(s);
    }

    case "POSADA":
      p.status.inmune = true;
      log(s, `⛪ ${p.name} se refugia en La Capilla: nadie le puede mandar beber hasta su próximo turno.`);
      return endTurn(s);

    case "A_BEBER":
    {
      // trago de regalo: de 1 a 3 vasos, al azar (el número de la casilla ya no cuenta)
      const amount = 1 + Math.floor(rng() * 3);
      s.giftAmount = amount;
      log(s, `🥃 Trago de regalo: ${p.name} reparte ${amount} ${vasos(amount)}.`);
      return decide(s, { kind: "DISTRIBUTE", amount });
    }

    case "DUELO":
      if (others.length === 0) return endTurn(s);
      log(s, `💀 Duelo de calaveras: ${p.name} reta hasta a ${Math.min(tile.amount, others.length)}.`);
      return decide(s, { kind: "DUEL", amount: Math.min(tile.amount, others.length) });

    case "OCA":
      log(s, `🦇 ${p.name} cae en un murciélago: ¿bebe 1 vaso para seguir de murciélago en murciélago?`);
      return decide(s, { kind: "OCA", next: tile.next ?? null });

    case "REGLA":
      log(s, `⚖️ ${p.name} dicta una nueva Ley del Más Allá.`);
      return decide(s, { kind: "RULE" });

    case "CULTURAL": {
      const category = pick(getCategories(), rng);
      s.category = category; // la tarjeta de la casilla la enseña ({categoria})
      return decide(s, {
        kind: "SELECT_DRINKERS",
        drinks: 1,
        title: TILE_NAMES.CULTURAL,
        text: `Categoría: "${category}" (o ${p.name} elige otra). Por turnos decís una cada uno; quien se quede en blanco o repita, bebe.`,
      });
    }

    case "YO_NUNCA": {
      const frase = pick(getNunca(), rng);
      s.nunca = frase; // la tarjeta de la casilla la enseña ({frase})
      log(s, `🤚 Yo nunca: ${frase}`);
      return decide(s, { kind: "NUNCA" });
    }

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
      log(s, `🔥 ${p.name} cae al Purgatorio. En su turno tira para ver cuánto debe beber para salir.`);
      return endTurn(s);
    }

    case "MUERTE":
      p.pos = 1;
      log(s, `⚰️ ${p.name} cae en La Fosa y vuelve a medianoche (casilla 1).`);
      return endTurn(s);

    case "PATINAZO":
      log(s, `🪦 ${p.name} tropieza con una lápida.`);
      return decide(s, { kind: "PATINAZO", drinks: PATINAZO_DRINKS, backTo: tile.backTo });

    case "RASGO": {
      // Juicio de los vivos: sale una carta distinta cada vez (votaciones y «beben todos los que…»); quien controla la mesa marca quiénes beben
      const frase = pick(getJuicio(), rng);
      s.juicio = frase; // la tarjeta de la casilla la enseña ({frase})
      log(s, `💀 Juicio de los vivos: ${frase}`);
      return decide(s, { kind: "SELECT_DRINKERS", drinks: 1, title: TILE_NAMES.RASGO, text: frase });
    }

    case "RETO": {
      if (tile.nickname) {
        const apodo = pick(getNicknames(), rng);
        s.nickname = apodo; // la tarjeta de la casilla lo enseña ({apodo})
        return decide(s, { kind: "SELECT_DRINKERS", drinks: 1, title: tile.title ?? TILE_NAMES.RETO, text: NICKNAME_TEXT.replace(/\{apodo\}/g, apodo) });
      }
      // Reto del Más Allá: sale uno distinto de la lista; el celular marca quiénes beben (los vasos salen del propio texto)
      let text = pick(getRetos(), rng);
      if (text.includes("{trabalenguas}")) text = text.replace(/\{trabalenguas\}/g, `«${pick(getTwisters(), rng)}»`);
      s.reto = text;
      log(s, `🎤 Reto del Más Allá: ${text}`);
      return decide(s, { kind: "SELECT_DRINKERS", drinks: drinksIn(text), title: TILE_NAMES.RETO, text });
    }

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
    log(s, `💀 ${p.name} reta a ${opps.map((id) => s.players.find((q) => q.id === id)!.name).join(" y a ")}: ¡cada uno tira su dado!`);
    decide(s, { kind: "DUEL_ROLL", rivals: opps, i: 0, a: null, b: null, tie: false, rounds: [] });
    return true;
  }

  // Cada dado del duelo lo tira el celular a mano (primero quien reta, luego su rival); con empate se repite la ronda.
  if (d.kind === "DUEL_ROLL" && action.type === "DUEL_ROLL") {
    const rival = s.players.find((q) => q.id === d.rivals[d.i])!;
    const fresh = d.a === null || d.b !== null; // empieza una ronda: tira quien reta
    const r = d6(rng);
    s.lastRoll = r;
    s.rollSeq = (s.rollSeq ?? 0) + 1;
    if (fresh) {
      s.lastRoller = p.id;
      d.a = r;
      d.b = null;
      d.tie = false;
      return true;
    }
    s.lastRoller = rival.id;
    d.b = r;
    const a = d.a!;
    if (a === r) {
      log(s, `💀 ${p.name} ${a} vs ${rival.name} ${r}: empate, otra vez.`);
      d.tie = true;
      return true;
    }
    const [winner, loser] = a > r ? [p, rival] : [rival, p];
    log(s, `💀 ${p.name} ${a} vs ${rival.name} ${r}: pierde ${loser.name}.`);
    drink(s, loser.id, 1, winner.id);
    d.rounds.push({ rival: rival.id, a, b: r, loser: loser.id });
    if (d.i + 1 < d.rivals.length) {
      d.i += 1; // siguiente rival: los dados de esta ronda siguen a la vista hasta que se tire el nuevo
      return true;
    }
    s.lastDuel = { seq: (s.lastDuel?.seq ?? 0) + 1, by: p.id, rounds: d.rounds };
    endTurn(s);
    return true;
  }

  if (d.kind === "NUNCA" && action.type === "NUNCA") {
    if (action.did) {
      log(s, `🤚 ${p.name} sí lo ha hecho y bebe 1 vaso.`);
      drink(s, p.id, 1, null);
    } else {
      log(s, `🤚 ${p.name} nunca lo ha hecho: no bebe.`);
    }
    endTurn(s);
    return true;
  }

  if (d.kind === "OCA" && action.type === "OCA") {
    if (action.choice === "fly") {
      log(s, `🦇 ¡De murciélago en murciélago y bebo porque me toca!`);
      drink(s, p.id, 1, null);
      if (d.next) {
        p.pos = d.next;
        log(s, `🦇 El murciélago lleva a ${p.name} hasta la ${d.next} y vuelve a tirar.`);
      } else {
        log(s, `🦋 ${p.name} vuelve a tirar.`);
      }
      s.extraRoll = true;
    } else {
      log(s, `🦇 ${p.name} se planta: se queda en la ${p.pos}.`);
    }
    endTurn(s);
    return true;
  }

  if (d.kind === "PATINAZO" && action.type === "PATINAZO") {
    if (action.choice === "drink") {
      log(s, `🪦 ${p.name} se agarra de la lápida bebiendo ${PATINAZO_DRINKS} de golpe.`);
      drink(s, p.id, PATINAZO_DRINKS, null);
    } else {
      p.pos = d.backTo;
      log(s, `🪦 ${p.name} rueda hasta la ${d.backTo}.`);
    }
    endTurn(s);
    return true;
  }

  if (d.kind === "RULE" && action.type === "SET_RULE") {
    // la ley se dicta en voz alta: aquí solo se anota que hay una vigente (para poder penalizar a quien la rompa)
    s.rule = { text: "", by: p.id };
    log(s, `⚖️ ${p.name} dictó una nueva ley.`);
    endTurn(s);
    return true;
  }

  if (d.kind === "SELECT_DRINKERS" && action.type === "SELECT_DRINKERS") {
    const chosen = [...new Set(action.ids)];
    if (chosen.some((id) => !ids.has(id))) return false;
    resolveDrinkers(s, chosen);
    return true;
  }

  if (d.kind === "JAIL_PAY" && action.type === "JAIL_PAY") {
    const n = action.n;
    if (!Number.isInteger(n) || n < 1 || n > d.owed || !p.status.carcel) return false;
    const left = d.owed - n;
    drink(s, p.id, n, null);
    s.lastJail = { seq: (s.lastJail?.seq ?? 0) + 1, by: p.id, paid: n, left };
    if (left === 0) {
      p.status.carcel = null;
      log(s, `🔓 ${p.name} paga su penitencia y sale del Purgatorio. Ahora tira para avanzar.`);
      s.extraRoll = true;
    } else {
      p.status.carcel.debt = left;
      log(s, `🔥 ${p.name} paga ${n} y queda debiendo ${left} ${vasos(left)}: sigue en el Purgatorio.`);
    }
    endTurn(s);
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
    bloodPact(s, hypnotized.id, half);
  }
  if (own > 0) {
    addDrinks(target, own);
    log(s, `🍷 ${target.name} bebe ${own} ${vasos(own)}.`);
    bloodPact(s, target.id, own);
  }
}

/** Pacto de Sangre: lo que bebe quien lo firmó (por la razón que sea) también lo bebe su pactado y se le cuenta en su marcador. */
function bloodPact(s: GameState, drinkerId: string, n: number) {
  if (!s.slave || s.slave.master !== drinkerId || n <= 0) return;
  const slave = s.players.find((q) => q.id === s.slave!.slave);
  if (!slave) return;
  addDrinks(slave, n);
  log(s, `🩸 ${slave.name}, por el Pacto de Sangre, bebe ${n} ${vasos(n)} (los mismos que ${s.players.find((q) => q.id === drinkerId)!.name}).`);
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
