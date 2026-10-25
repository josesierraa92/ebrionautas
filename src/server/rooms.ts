// Salas multijugador. El servidor es la autoridad: guarda el estado, tira los
// dados y valida que cada acción venga del jugador al que le toca.

import { sanitizeAvatar, type AvatarConfig } from "@/game/avatar";
import { applyAction, createGame, currentPlayer, type Action, type GameState } from "@/game/engine";
import { PLAYER_COLORS } from "@/game/tileStyle";
import { getStore } from "./store";

const ROOM_TTL = 60 * 60 * 24; // 24 h
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I ni O para no confundir
export const MAX_PLAYERS = PLAYER_COLORS.length;

type Member = { id: string; name: string; color: string; avatar: AvatarConfig; secret: string };

type Room = {
  code: string;
  hostSecret: string;
  status: "LOBBY" | "PLAYING";
  members: Member[];
  game: GameState | null;
  version: number;
};

export type PublicRoom = {
  code: string;
  status: Room["status"];
  members: { id: string; name: string; color: string; avatar: AvatarConfig }[];
  game: GameState | null;
  version: number;
};

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
    members: room.members.map(({ id, name, color, avatar }) => ({ id, name, color, avatar })),
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

/** Ejecuta `fn` con la sala bloqueada para que dos celulares no pisen el estado. */
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

export async function getRoom(code: string): Promise<PublicRoom> {
  return toPublic(await load(code));
}

export async function createRoom(): Promise<{ code: string; hostSecret: string }> {
  const store = getStore();
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
    if (await store.get(key(code))) continue;
    const room: Room = { code, hostSecret: secret(), status: "LOBBY", members: [], game: null, version: 0 };
    await save(room);
    return { code, hostSecret: room.hostSecret };
  }
  throw new RoomError("No se pudo crear la mesa, inténtalo de nuevo.", 500);
}

export async function joinRoom(code: string, name: string, rawAvatar?: unknown): Promise<{ playerId: string; secret: string }> {
  const clean = name.trim().slice(0, 16);
  if (!clean) throw new RoomError("Escribe tu nombre.");
  return withRoom(code, (room) => {
    if (room.status !== "LOBBY") throw new RoomError("La partida ya empezó.", 409);
    if (room.members.length >= MAX_PLAYERS) throw new RoomError("La mesa está llena.", 409);
    if (room.members.some((m) => m.name.toLowerCase() === clean.toLowerCase()))
      throw new RoomError("Ese nombre ya está en la mesa.", 409);
    const seatColor = PLAYER_COLORS[room.members.length];
    const avatar = sanitizeAvatar(rawAvatar, seatColor);
    // La ficha del tablero usa el color del Marciano si nadie más lo tiene; si no, uno libre.
    const taken = new Set(room.members.map((m) => m.color));
    const color = taken.has(avatar.skin) ? PLAYER_COLORS.find((c) => !taken.has(c))! : avatar.skin;
    const member: Member = { id: `p${room.members.length + 1}`, name: clean, color, avatar, secret: secret() };
    room.members.push(member);
    return { playerId: member.id, secret: member.secret };
  });
}

/** Empieza la partida: la pantalla anfitriona o el primer jugador que se unió. */
export async function startRoom(code: string, who: string): Promise<void> {
  await withRoom(code, (room) => {
    const allowed = who === room.hostSecret || who === room.members[0]?.secret;
    if (!allowed) throw new RoomError("Solo la pantalla de la mesa o el primer jugador pueden empezar.", 403);
    if (room.status !== "LOBBY") throw new RoomError("La partida ya empezó.", 409);
    if (room.members.length < 2) throw new RoomError("Hacen falta al menos 2 jugadores.");
    room.game = createGame(room.members.map(({ name, color, avatar }) => ({ name, color, avatar })));
    room.status = "PLAYING";
  });
}

export async function actInRoom(code: string, who: string, action: Action): Promise<void> {
  await withRoom(code, (room) => {
    const member = room.members.find((m) => m.secret === who);
    if (!member) throw new RoomError("No eres parte de esta mesa.", 403);
    if (!room.game) throw new RoomError("La partida no ha empezado.", 409);
    // Votar y confirmar "¡Bebido!" solo por uno mismo; denunciar a quien rompe la ley, cualquiera;
    // el resto de jugadas, solo quien tiene el turno.
    if (action.type === "VOTE" || action.type === "DRANK") {
      if (action.id !== member.id) throw new RoomError("Solo puedes responder por ti.", 403);
    } else if (action.type !== "PENALTY" && currentPlayer(room.game).id !== member.id) {
      throw new RoomError("No es tu turno.", 403);
    }
    const next = applyAction(room.game, action);
    if (next === room.game) throw new RoomError("Esa jugada no es válida ahora.", 409);
    room.game = next;
  });
}
