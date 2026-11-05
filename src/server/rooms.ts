// Mesas: la TV muestra el tablero y un único celular la controla. El servidor es
// la autoridad: guarda la partida, tira los dados y solo acepta jugadas del control.

import { defaultAvatar } from "@/game/avatar";
import { setLists } from "@/game/content";
import { loadLists } from "./lists";
import { applyAction, createGame, currentPlayer, matchOver, type Action, type GameState, type Gender } from "@/game/engine";
import { PLAYER_COLORS } from "@/game/tileStyle";
import { SERIOUS_ROLLS, track } from "./stats";
import { getStore } from "./store";

const ROOM_TTL = 60 * 60 * 24; // 24 h
const CLAIM_REQUEST_TTL = 2 * 60 * 1000; // el aviso «otro celular quiere el control» dura 2 min
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I ni O para no confundir
export const MAX_PLAYERS = PLAYER_COLORS.length;

/** Mesa local: un anfitrión maneja la partida (pantalla sola, o pantalla + un celular). Online: cada jugador entra con su aparato y tira en su turno. */
export type RoomMode = "local" | "online";

/** Quien está sentado en una mesa online. `secret` nunca sale del servidor. */
type Member = { id: string; secret: string; name: string; gender: Gender; look?: number; host?: boolean; playerId?: string };
export type PublicMember = Omit<Member, "secret">;

type Room = {
  code: string;
  mode?: RoomMode; // sin dato = mesa local (las de antes)
  members?: Member[]; // online
  cups?: number;
  hostSecret: string; // la TV que creó la mesa
  controllerSecret: string | null; // el celular que la controla
  epoch?: number; // cuántas veces se ha tomado el control: el celular que lo tenía se entera de que ya no es suyo
  claimRequest?: number | null; // cuándo (ms) otro celular pidió el control: la TV enseña «¿liberar?»
  status: "LOBBY" | "PLAYING";
  game: GameState | null;
  version: number;
};

export type PublicRoom = {
  code: string;
  mode: RoomMode;
  /** Online: quién está en la sala (sin claves). Una vez empezada la partida, `playerId` dice qué jugador es cada uno. */
  members: PublicMember[];
  status: Room["status"];
  hasController: boolean;
  /** Cuántas veces se ha tomado el control de esta mesa (no es un secreto): si no coincide con el que guardó un celular, ese celular ya no controla. */
  controlEpoch: number;
  /** Marca de tiempo del último celular que pidió el control mientras otro lo tenía (la TV enseña el aviso «liberar»); si es viejo, `null`. */
  claimRequest: number | null;
  game: GameState | null;
  version: number;
};

export type NewPlayer = { name: string; gender: Gender; look?: number };

export class RoomError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const key = (code: string) => `room:${code}`;
const secret = () => crypto.randomUUID();

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export function toPublic(room: Room): PublicRoom {
  return {
    code: room.code,
    mode: room.mode ?? "local",
    members: (room.members ?? []).map(({ secret: _s, ...m }) => m),
    status: room.status,
    hasController: room.controllerSecret !== null,
    controlEpoch: room.epoch ?? 0,
    claimRequest: room.claimRequest && Date.now() - room.claimRequest < CLAIM_REQUEST_TTL ? room.claimRequest : null,
    game: room.game,
    version: room.version,
  };
}

async function load(code: string): Promise<Room> {
  const raw = await getStore().get(key(normalizeCode(code)));
  if (!raw) throw new RoomError("Esa mesa no existe o ya caducó.", 404);
  return JSON.parse(raw) as Room;
}

async function save(room: Room) {
  room.version += 1;
  await getStore().set(key(room.code), JSON.stringify(room), ROOM_TTL);
}

/** Ejecuta `fn` con la mesa bloqueada para que dos peticiones no pisen el estado. */
async function withRoom<T>(code: string, fn: (room: Room) => T): Promise<T> {
  const store = getStore();
  const lockKey = `lock:${normalizeCode(code)}`;
  for (let i = 0; i < 20; i++) {
    if (await store.setNx(lockKey, "1", 3000)) {
      try {
        const room = await load(code);
        const result = fn(room);
        await save(room);
        return result;
      } finally {
        await store.del(lockKey);
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new RoomError("La mesa está ocupada, inténtalo de nuevo.", 409);
}

function assertController(room: Room, who: string) {
  if (!room.controllerSecret || who !== room.controllerSecret)
    throw new RoomError("Este celular no controla la mesa.", 403);
}

const isOnline = (room: Room) => room.mode === "online";

function memberOf(room: Room, who: string): Member | undefined {
  return who ? room.members?.find((m) => m.secret === who) : undefined;
}

/** Online: el anfitrión es quien creó la sala (su clave de creador al entrar). */
function assertHost(room: Room, who: string) {
  if (!memberOf(room, who)?.host) throw new RoomError("Solo el anfitrión puede hacer eso.", 403);
}

/** Online: entra a la sala. Quien trae la clave de creador es el anfitrión. En partida ya no se puede entrar. */
export async function joinRoom(code: string, player: NewPlayer, hostSecret?: string): Promise<{ secret: string; id: string }> {
  const name = String(player?.name ?? "").trim().slice(0, 12);
  if (!name) throw new RoomError("Escribe tu nombre.");
  if (player?.gender !== "hombre" && player?.gender !== "mujer") throw new RoomError("Elige hombre o mujer.");
  return withRoom(code, (room) => {
    if (!isOnline(room)) throw new RoomError("Esta mesa es local: se maneja desde la pantalla de la mesa.", 409);
    if (room.status !== "LOBBY") throw new RoomError("La partida ya empezó.", 409);
    const members = (room.members ??= []);
    if (members.length >= MAX_PLAYERS) throw new RoomError(`La sala está llena (máximo ${MAX_PLAYERS}).`, 409);
    if (members.some((m) => m.name.toLowerCase() === name.toLowerCase())) throw new RoomError("Ya hay alguien con ese nombre en la sala.", 409);
    const host = !!hostSecret && hostSecret === room.hostSecret && !members.some((m) => m.host);
    const same = members.filter((m) => m.gender === player.gender).length;
    const look = Number.isInteger(player.look) && player.look! >= 0 && player.look! < 6 ? player.look : same % 6;
    const member: Member = { id: crypto.randomUUID().slice(0, 8), secret: secret(), name, gender: player.gender, look, ...(host ? { host: true } : {}) };
    members.push(member);
    return { secret: member.secret, id: member.id };
  });
}

/** Online: el anfitrión saca a alguien de la sala (solo en la sala de espera) o alguien se va por su cuenta. */
export async function leaveRoom(code: string, who: string, memberId?: string): Promise<void> {
  await withRoom(code, (room) => {
    if (!isOnline(room)) throw new RoomError("Esta mesa es local.", 409);
    if (room.status !== "LOBBY") throw new RoomError("La partida ya empezó.", 409);
    const me = memberOf(room, who);
    if (!me) throw new RoomError("No estás en esta sala.", 403);
    const target = memberId && memberId !== me.id ? room.members!.find((m) => m.id === memberId) : me;
    if (!target) return;
    if (target.id !== me.id && !me.host) throw new RoomError("Solo el anfitrión puede sacar a alguien.", 403);
    room.members = room.members!.filter((m) => m.id !== target.id);
    if (target.host) room.members = room.members.map((m, i) => (i === 0 ? { ...m, host: true } : m)); // si se va el anfitrión, lo hereda el más antiguo
  });
}

/** Online: el anfitrión empieza con quienes están en la sala (mínimo 2). */
export async function startOnline(code: string, who: string, cups = 1): Promise<void> {
  const goal = [1, 2, 3].includes(cups) ? cups : 1;
  let count = 0;
  await withRoom(code, (room) => {
    if (!isOnline(room)) throw new RoomError("Esta mesa es local.", 409);
    assertHost(room, who);
    if (room.status !== "LOBBY") throw new RoomError("La partida ya empezó.", 409);
    const members = room.members ?? [];
    if (members.length < 2) throw new RoomError("Hacen falta al menos 2 jugadores en la sala.");
    room.cups = goal;
    room.game = createGame(
      members.map((m, i) => ({ name: m.name, gender: m.gender, look: m.look, color: PLAYER_COLORS[i], avatar: defaultAvatar(i, PLAYER_COLORS[i]) })),
      goal,
    );
    members.forEach((m, i) => (m.playerId = `p${i + 1}`));
    room.status = "PLAYING";
    count = members.length;
  });
  await track("partida");
  await track("jugadores", count);
}

/** Acciones que solo hace el anfitrión en una mesa online (manejar la partida). */
const HOST_ONLY = new Set<Action["type"]>(["END_GAME", "REMOVE_PLAYER", "PAUSE_PLAYER", "REMOVE_DRINK", "RANKING"]);
/** Acciones que cualquiera de la mesa puede hacer en cualquier momento (un trago suelto). */
const ANYONE = new Set<Action["type"]>(["ADD_DRINK"]);

function assertActor(room: Room, who: string, action: Action, game: GameState) {
  const me = memberOf(room, who);
  if (!me) throw new RoomError("No estás en esta mesa.", 403);
  if (ANYONE.has(action.type)) return;
  if (HOST_ONLY.has(action.type)) return assertHost(room, who);
  // el resto (tirar, decidir, siguiente turno…): solo a quien le toca; el anfitrión puede hacerlo por cualquiera (si a alguien se le acabó la batería)
  if (me.host || me.playerId === currentPlayer(game).id) return;
  throw new RoomError("No es tu turno.", 403);
}

export async function getRoom(code: string): Promise<PublicRoom> {
  return toPublic(await load(code));
}

export async function createRoom(mode: RoomMode = "local"): Promise<{ code: string; hostSecret: string }> {
  const store = getStore();
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
    if (await store.get(key(code))) continue;
    const room: Room = { code, mode: mode === "online" ? "online" : "local", members: [], hostSecret: secret(), controllerSecret: null, status: "LOBBY", game: null, version: 0 };
    await save(room);
    await track("mesa");
    return { code, hostSecret: room.hostSecret };
  }
  throw new RoomError("No se pudo crear la mesa, inténtalo de nuevo.", 500);
}

/** El primer celular que lo pide se queda con el control. */
export async function claimControl(code: string): Promise<{ secret: string; epoch: number }> {
  const result = await withRoom(code, (room) => {
    if (room.controllerSecret) throw new RoomError("Otro celular ya controla esta mesa. Pide que lo liberen desde la TV.", 409);
    room.controllerSecret = secret();
    room.claimRequest = null;
    room.epoch = (room.epoch ?? 0) + 1;
    return { secret: room.controllerSecret, epoch: room.epoch };
  });
  await track("celular");
  return result;
}

/** Desde la TV: suelta el control para que otro celular lo tome (ej. si se perdió). */
export async function releaseControl(code: string, hostSecret: string): Promise<void> {
  await withRoom(code, (room) => {
    if (hostSecret !== room.hostSecret) throw new RoomError("Solo la pantalla de la mesa puede liberar el control.", 403);
    room.controllerSecret = null;
    room.claimRequest = null;
  });
}

/**
 * Un celular nuevo avisa de que quiere el control mientras otro lo tiene: la TV (que ve `claimRequest`) enseña «¿liberar?».
 * Si nadie controla, no hace falta pedir nada (`free: true`).
 */
export async function requestControl(code: string): Promise<{ free: boolean }> {
  return withRoom(code, (room) => {
    if (!room.controllerSecret) return { free: true };
    room.claimRequest = Date.now();
    return { free: false };
  });
}

export async function startRoom(code: string, who: string, players: NewPlayer[], cups = 1): Promise<void> {
  const goal = [1, 2, 3].includes(cups) ? cups : 1;
  const clean = players
    .map((p) => ({ name: String(p?.name ?? "").trim().slice(0, 12), gender: p?.gender, look: Number.isInteger(p?.look) && p.look! >= 0 && p.look! < 6 ? p.look : undefined }))
    .filter((p) => p.name);
  if (clean.length < 2) throw new RoomError("Hacen falta al menos 2 jugadores.");
  if (clean.length > MAX_PLAYERS) throw new RoomError(`Máximo ${MAX_PLAYERS} jugadores.`);
  if (clean.some((p) => p.gender !== "hombre" && p.gender !== "mujer")) throw new RoomError("Elige hombre o mujer para cada jugador.");
  if (new Set(clean.map((p) => p.name.toLowerCase())).size !== clean.length) throw new RoomError("Hay nombres repetidos.");

  await withRoom(code, (room) => {
    if (isOnline(room)) throw new RoomError("En una mesa online empieza el anfitrión desde la sala de espera.", 409);
    assertController(room, who);
    if (room.status !== "LOBBY") throw new RoomError("La partida ya empezó.", 409);
    room.game = createGame(
      clean.map((p, i) => ({ name: p.name, gender: p.gender, look: p.look, color: PLAYER_COLORS[i], avatar: defaultAvatar(i, PLAYER_COLORS[i]) })),
      goal,
    );
    room.status = "PLAYING";
  });
  await track("partida");
  await track("jugadores", clean.length);
}

/**
 * Otra partida en la misma mesa. Con `same` (REINICIAR) empieza ya con los mismos jugadores (nombre, género, color); sin `same`
 * (SALIR) vuelve a la pantalla de jugadores. Solo se llama a mano desde el celular: nada reinicia la partida terminada por sí solo.
 */
export async function resetRoom(code: string, who: string, same = false, nextRound = false): Promise<void> {
  const started = await withRoom(code, (room) => {
    if (isOnline(room)) assertHost(room, who);
    else assertController(room, who);
    if (same && room.game) {
      // siguiente ronda (modo de varias copas): mismos jugadores con sus copas y lo bebido; si no, partida nueva con las mismas copas por ganar
      room.game = createGame(
        room.game.players.map((p) => ({ name: p.name, gender: p.gender, look: p.look, color: p.color, avatar: p.avatar, ...(nextRound ? { cups: p.cups, drunk: p.drunk, pending: p.pending, paused: p.paused } : {}) })),
        room.game.cupsGoal ?? 1,
        nextRound ? room.game.seen : undefined, // entre rondas no se repiten las cartas que ya salieron
      );
      room.status = "PLAYING";
      return nextRound ? 0 : room.game.players.length; // la siguiente ronda sigue la misma partida; REINICIAR es una partida nueva
    }
    room.game = null;
    room.status = "LOBBY";
    room.members?.forEach((m) => delete m.playerId);
    return 0;
  });
  if (started > 0) {
    await track("partida");
    await track("jugadores", started);
  }
}

export async function actInRoom(code: string, who: string, action: Action): Promise<void> {
  // las listas que dejó el admin (categorías de La Ouija, trabalenguas y apodos: el motor las usa al caer alguien en la casilla)
  if (action.type === "ROLL" || action.type === "DUEL_ROLL") setLists(await loadLists().catch(() => null));
  const events = await withRoom(code, (room) => {
    if (!isOnline(room)) assertController(room, who);
    if (!room.game) throw new RoomError("La partida no ha empezado.", 409);
    if (isOnline(room)) assertActor(room, who, action, room.game);
    const prev = room.game;
    const next = applyAction(prev, action);
    if (next === prev) throw new RoomError("Esa jugada no es válida ahora.", 409);
    room.game = next;
    // estadísticas anónimas: la partida pasa de «probando» a «en serio» al llegar a SERIOUS_ROLLS tiradas, y se cuenta una vez al terminar
    const events: Parameters<typeof track>[0][] = [];
    if ((prev.rollSeq ?? 0) < SERIOUS_ROLLS && (next.rollSeq ?? 0) >= SERIOUS_ROLLS) events.push("enserio");
    if (matchOver(next) && !matchOver(prev)) events.push("terminada");
    return events;
  });
  for (const ev of events) await track(ev);
}
