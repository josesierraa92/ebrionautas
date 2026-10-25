import { beforeEach, describe, expect, it } from "vitest";
import { actInRoom, createRoom, getRoom, joinRoom, startRoom } from "./rooms";
import { resetMemoryStore } from "./store";

beforeEach(() => {
  resetMemoryStore();
});

async function roomWith(...names: string[]) {
  const { code, hostSecret } = await createRoom();
  const players = [];
  for (const n of names) players.push(await joinRoom(code, n));
  return { code, hostSecret, players };
}

describe("salas", () => {
  it("crea una sala con código de 4 letras y sin secretos en la vista pública", async () => {
    const { code } = await roomWith("Ana");
    expect(code).toMatch(/^[A-Z]{4}$/);
    const room = await getRoom(code.toLowerCase());
    expect(room.members).toEqual([{ id: "p1", name: "Ana", color: expect.any(String) }]);
    expect(JSON.stringify(room)).not.toContain("secret");
  });

  it("no permite nombres repetidos ni unirse tras empezar", async () => {
    const { code, hostSecret } = await roomWith("Ana", "Beto");
    await expect(joinRoom(code, "ana")).rejects.toThrow("Ese nombre");
    await startRoom(code, hostSecret);
    await expect(joinRoom(code, "Caro")).rejects.toThrow("ya empezó");
  });

  it("empieza la pantalla anfitriona o el primer jugador, con al menos 2", async () => {
    const { code, players } = await roomWith("Ana");
    await expect(startRoom(code, players[0].secret)).rejects.toThrow("al menos 2");
    const b = await joinRoom(code, "Beto");
    await expect(startRoom(code, b.secret)).rejects.toThrow("Solo");
    await startRoom(code, players[0].secret);
    expect((await getRoom(code)).status).toBe("PLAYING");
  });

  it("solo tira quien tiene el turno; cualquiera puede penalizar", async () => {
    const { code, hostSecret, players } = await roomWith("Ana", "Beto");
    await startRoom(code, hostSecret);
    await expect(actInRoom(code, players[1].secret, { type: "ROLL" })).rejects.toThrow("No es tu turno");
    await expect(actInRoom(code, "intruso", { type: "ROLL" })).rejects.toThrow("No eres parte");
    await actInRoom(code, players[0].secret, { type: "ROLL" });
    expect((await getRoom(code)).game?.lastRoll).toBeGreaterThan(0);
    await actInRoom(code, players[1].secret, { type: "PENALTY", id: "p1" });
  });

  it("rechaza jugadas inválidas y sube la versión con cada cambio", async () => {
    const { code, hostSecret, players } = await roomWith("Ana", "Beto");
    await startRoom(code, hostSecret);
    const v = (await getRoom(code)).version;
    await expect(actInRoom(code, players[0].secret, { type: "SET_RULE", text: "x" })).rejects.toThrow("no es válida");
    expect((await getRoom(code)).version).toBe(v);
  });

  it("da error claro si la sala no existe", async () => {
    await expect(getRoom("ZZZZ")).rejects.toThrow("no existe");
  });
});
