import { beforeEach, describe, expect, it, vi } from "vitest";
import { actInRoom, claimControl, createRoom, getRoom, releaseControl, requestControl, resetRoom, startRoom, type NewPlayer } from "./rooms";
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
