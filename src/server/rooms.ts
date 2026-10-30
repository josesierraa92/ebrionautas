// Mesas: la TV muestra el tablero y un único celular la controla. El servidor es
// la autoridad: guarda la partida, tira los dados y solo acepta jugadas del control.

import { defaultAvatar } from "@/game/avatar";
import { DEFAULT_CATEGORIES, setCategories } from "@/game/content";
import { loadCategories } from "./categories";
import { applyAction, createGame, type Action, type GameState, type Gender } from "@/game/engine";
import { PLAYER_COLORS } from "@/game/tileStyle";
import { getStore } from "./store";

const ROOM_TTL = 60 * 60 * 24; // 24 h
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I ni O para no confundir
export const MAX_PLAYERS = PLAYER_COLORS.length;

type Room = {
  code: string;
  hostSecret: string; // la TV que creó la mesa
  controllerSecret: string | null; // el celular que la controla
  status: "LOBBY" | "PLAYING";
  game: GameState | null;
  version: number;
};

export type PublicRoom = {
  code: string;
  status: Room["status"];
  hasController: boolean;
  game: GameState | null;
  version: number;
};

export type NewPlayer = { name: string; gender: Gender };

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
    status: room.status,
    hasController: room.controllerSecret !== null,
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

export async function getRoom(code: string): Promise<PublicRoom> {
  return toPublic(await load(code));
}

export async function createRoom(): Promise<{ code: string; hostSecret: string }> {
  const store = getStore();
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
    if (await store.get(key(code))) continue;
    const room: Room = { code, hostSecret: secret(), controllerSecret: null, status: "LOBBY", game: null, version: 0 };
    await save(room);
    return { code, hostSecret: room.hostSecret };
  }
  throw new RoomError("No se pudo crear la mesa, inténtalo de nuevo.", 500);
}

/** El primer celular que lo pide se queda con el control. */
export async function claimControl(code: string): Promise<{ secret: string }> {
  return withRoom(code, (room) => {
    if (room.controllerSecret) throw new RoomError("Otro celular ya controla esta mesa. Pide que lo liberen desde la TV.", 409);
    room.controllerSecret = secret();
    return { secret: room.controllerSecret };
  });
}

/** Desde la TV: suelta el control para que otro celular lo tome (ej. si se perdió). */
export async function releaseControl(code: string, hostSecret: string): Promise<void> {
  await withRoom(code, (room) => {
    if (hostSecret !== room.hostSecret) throw new RoomError("Solo la pantalla de la mesa puede liberar el control.", 403);
    room.controllerSecret = null;
  });
}

export async function startRoom(code: string, who: string, players: NewPlayer[]): Promise<void> {
  const clean = players
    .map((p) => ({ name: String(p?.name ?? "").trim().slice(0, 16), gender: p?.gender }))
    .filter((p) => p.name);
  if (clean.length < 2) throw new RoomError("Hacen falta al menos 2 jugadores.");
  if (clean.length > MAX_PLAYERS) throw new RoomError(`Máximo ${MAX_PLAYERS} jugadores.`);
  if (clean.some((p) => p.gender !== "hombre" && p.gender !== "mujer")) throw new RoomError("Elige hombre o mujer para cada jugador.");
  if (new Set(clean.map((p) => p.name.toLowerCase())).size !== clean.length) throw new RoomError("Hay nombres repetidos.");

  await withRoom(code, (room) => {
    assertController(room, who);
    if (room.status !== "LOBBY") throw new RoomError("La partida ya empezó.", 409);
    room.game = createGame(
      clean.map((p, i) => ({ name: p.name, gender: p.gender, color: PLAYER_COLORS[i], avatar: defaultAvatar(i, PLAYER_COLORS[i]) })),
    );
    room.status = "PLAYING";
  });
}

/**
 * Otra partida en la misma mesa. Con `same` (REINICIAR) empieza ya con los mismos jugadores (nombre, género, color); sin `same`
 * (SALIR) vuelve a la pantalla de jugadores. Solo se llama a mano desde el celular: nada reinicia la partida terminada por sí solo.
 */
export async function resetRoom(code: string, who: string, same = false): Promise<void> {
  await withRoom(code, (room) => {
    assertController(room, who);
    if (same && room.game) {
      room.game = createGame(room.game.players.map((p) => ({ name: p.name, gender: p.gender, color: p.color, avatar: p.avatar })));
      room.status = "PLAYING";
      return;
    }
    room.game = null;
    room.status = "LOBBY";
  });
}

export async function actInRoom(code: string, who: string, action: Action): Promise<void> {
  // las categorías de La Ouija que dejó el admin (el motor las usa al caer alguien en la casilla)
  if (action.type === "ROLL" || action.type === "DUEL_ROLL") setCategories(await loadCategories().catch(() => DEFAULT_CATEGORIES));
  await withRoom(code, (room) => {
    assertController(room, who);
    if (!room.game) throw new RoomError("La partida no ha empezado.", 409);
    const next = applyAction(room.game, action);
    if (next === room.game) throw new RoomError("Esa jugada no es válida ahora.", 409);
    room.game = next;
  });
}
