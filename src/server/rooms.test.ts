import { beforeEach, describe, expect, it, vi } from "vitest";
import { actInRoom, claimControl, createRoom, getRoom, joinRoom, leaveRoom, releaseControl, requestControl, resetRoom, startOnline, startRoom, type NewPlayer } from "./rooms";
import { resetMemoryStore } from "./store";

beforeEach(() => {
  resetMemoryStore();
});

const CREW: NewPlayer[] = [
  { name: "Ana", gender: "mujer" },
  { name: "Beto", gender: "hombre" },
];

async function playing() {
  const { code, hostSecret } = await createRoom();
  const { secret } = await claimControl(code);
  await startRoom(code, secret, CREW);
  return { code, hostSecret, secret };
}

describe("mesas", () => {
  it("crea una mesa con código de 4 letras y sin secretos en la vista pública", async () => {
    const { code } = await createRoom();
    expect(code).toMatch(/^[A-Z]{4}$/);
    const room = await getRoom(code.toLowerCase());
    expect(room).toMatchObject({ status: "LOBBY", hasController: false, game: null });
    await claimControl(code);
    expect(JSON.stringify(await getRoom(code))).not.toMatch(/secret/i);
  });

  it("solo un celular controla la mesa hasta que la TV lo libera", async () => {
    const { code, hostSecret } = await createRoom();
    await claimControl(code);
    await expect(claimControl(code)).rejects.toThrow("Otro celular");
    await expect(releaseControl(code, "otra-tv")).rejects.toThrow("Solo la pantalla");
    await releaseControl(code, hostSecret);
    expect((await getRoom(code)).hasController).toBe(false);
    await claimControl(code);
  });

  it("valida la tripulación al empezar", async () => {
    const { code } = await createRoom();
    const { secret } = await claimControl(code);
    await expect(startRoom(code, "intruso", CREW)).rejects.toThrow("no controla");
    await expect(startRoom(code, secret, [CREW[0]])).rejects.toThrow("al menos 2");
    await expect(startRoom(code, secret, [CREW[0], { name: "ana", gender: "mujer" }])).rejects.toThrow("repetidos");
    await expect(startRoom(code, secret, [CREW[0], { name: "Beto" } as NewPlayer])).rejects.toThrow("hombre o mujer");
    await startRoom(code, secret, CREW);
    const { game } = await getRoom(code);
    expect(game?.players.map((p) => [p.name, p.gender])).toEqual([
      ["Ana", "mujer"],
      ["Beto", "hombre"],
    ]);
  });

  it("solo el control juega, y puede empezar otra partida al terminar", async () => {
    const { code, secret } = await playing();
    await expect(actInRoom(code, "intruso", { type: "ROLL" })).rejects.toThrow("no controla");
    await actInRoom(code, secret, { type: "ROLL" });
    expect((await getRoom(code)).game?.lastRoll).toBeGreaterThan(0);
    await resetRoom(code, secret);
    expect(await getRoom(code)).toMatchObject({ status: "LOBBY", game: null, hasController: true });
  });

  it("rechaza jugadas inválidas sin cambiar la versión", async () => {
    const { code, secret } = await playing();
    const v = (await getRoom(code)).version;
    await expect(actInRoom(code, secret, { type: "SET_RULE" })).rejects.toThrow("no es válida");
    expect((await getRoom(code)).version).toBe(v);
  });

  it("da error claro si la mesa no existe", async () => {
    await expect(getRoom("ZZZZ")).rejects.toThrow("no existe");
  });
});

describe("pedir el control", () => {
  it("sin dueño no hace falta pedir; con dueño la TV ve la petición y se borra al liberar o al tomarlo otro", async () => {
    const { code, hostSecret } = await createRoom();
    expect(await requestControl(code)).toEqual({ free: true });
    expect((await getRoom(code)).claimRequest).toBeNull();

    await claimControl(code);
    expect(await requestControl(code)).toEqual({ free: false });
    const asked = (await getRoom(code)).claimRequest;
    expect(asked).toBeGreaterThan(0);

    await releaseControl(code, hostSecret);
    expect((await getRoom(code)).claimRequest).toBeNull();

    // la petición vieja (más de 2 min) deja de verse
    await claimControl(code);
    await requestControl(code);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 3 * 60 * 1000);
    expect((await getRoom(code)).claimRequest).toBeNull();
    vi.useRealTimers();
  });
});

describe("mesa online", () => {
  async function sala() {
    const { code, hostSecret } = await createRoom("online");
    const host = await joinRoom(code, { name: "Ana", gender: "mujer" }, hostSecret);
    const beto = await joinRoom(code, { name: "Beto", gender: "hombre" });
    return { code, hostSecret, host, beto };
  }

  it("la mesa online nace en modo online y la local sigue igual", async () => {
    expect((await getRoom((await createRoom("online")).code)).mode).toBe("online");
    expect((await getRoom((await createRoom()).code)).mode).toBe("local");
  });

  it("quien trae la clave de creador es el anfitrión y la vista pública no enseña claves", async () => {
    const { code } = await sala();
    const room = await getRoom(code);
    expect(room.members.map((m) => [m.name, !!m.host])).toEqual([["Ana", true], ["Beto", false]]);
    expect(JSON.stringify(room)).not.toMatch(/secret/i);
  });

  it("no deja nombres repetidos ni entrar a una mesa local ni con la partida empezada", async () => {
    const { code, host } = await sala();
    await expect(joinRoom(code, { name: "ana", gender: "mujer" })).rejects.toThrow("mismo nombre".replace("mismo nombre", "ese nombre"));
    const local = await createRoom();
    await expect(joinRoom(local.code, { name: "Cleo", gender: "mujer" })).rejects.toThrow("local");
    await startOnline(code, host.secret);
    await expect(joinRoom(code, { name: "Dani", gender: "hombre" })).rejects.toThrow("ya empezó");
  });

  it("solo el anfitrión empieza y hacen falta 2", async () => {
    const { code, host, beto } = await sala();
    await expect(startOnline(code, beto.secret)).rejects.toThrow("anfitrión");
    const solo = await createRoom("online");
    const h = await joinRoom(solo.code, { name: "Sola", gender: "mujer" }, solo.hostSecret);
    await expect(startOnline(solo.code, h.secret)).rejects.toThrow("al menos 2");
    await startOnline(code, host.secret, 2);
    const room = await getRoom(code);
    expect(room.status).toBe("PLAYING");
    expect(room.game?.cupsGoal).toBe(2);
    expect(room.members.map((m) => m.playerId)).toEqual(["p1", "p2"]);
  });

  it("solo tira quien tiene el turno; el anfitrión puede hacerlo por otros", async () => {
    const { code, host, beto } = await sala();
    await startOnline(code, host.secret);
    await expect(actInRoom(code, beto.secret, { type: "ROLL" })).rejects.toThrow("tu turno");
    await expect(actInRoom(code, "intruso", { type: "ROLL" })).rejects.toThrow("No estás");
    await actInRoom(code, host.secret, { type: "ROLL" }); // Ana tiene el turno 1
    const room = await getRoom(code);
    expect(room.game!.rollSeq).toBe(1);
  });

  it("los ajustes de la partida son del anfitrión y +trago de cualquiera", async () => {
    const { code, host, beto } = await sala();
    await startOnline(code, host.secret);
    await expect(actInRoom(code, beto.secret, { type: "END_GAME" })).rejects.toThrow("anfitrión");
    await actInRoom(code, beto.secret, { type: "ADD_DRINK", id: "p1" });
    expect((await getRoom(code)).game!.players[0].drunk).toBe(1);
  });

  it("reiniciar es del anfitrión y vuelve a la sala sin perder a nadie", async () => {
    const { code, host, beto } = await sala();
    await startOnline(code, host.secret);
    await expect(resetRoom(code, beto.secret)).rejects.toThrow("anfitrión");
    await resetRoom(code, host.secret);
    const room = await getRoom(code);
    expect(room.status).toBe("LOBBY");
    expect(room.members).toHaveLength(2);
    expect(room.members.every((m) => !m.playerId)).toBe(true);
  });

  it("alguien puede salirse de la sala y el anfitrión puede sacar a otro", async () => {
    const { code, host, beto } = await sala();
    const cleo = await joinRoom(code, { name: "Cleo", gender: "mujer" });
    await expect(leaveRoom(code, beto.secret, cleo.id)).rejects.toThrow("anfitrión");
    await leaveRoom(code, host.secret, cleo.id);
    await leaveRoom(code, beto.secret);
    expect((await getRoom(code)).members.map((m) => m.name)).toEqual(["Ana"]);
  });
});
