import { beforeEach, describe, expect, it, vi } from "vitest";
import { actInRoom, claimControl, createRoom, resetRoom, startRoom, type NewPlayer } from "./rooms";
import { dayOf, loadStats, SERIOUS_ROLLS, totalsOf, track } from "./stats";
import { getStore, resetMemoryStore } from "./store";

beforeEach(() => {
  resetMemoryStore();
});

const CREW: NewPlayer[] = [
  { name: "Ana", gender: "mujer" },
  { name: "Beto", gender: "hombre" },
  { name: "Caro", gender: "mujer" },
];

const today = async () => (await loadStats(1))[0];

describe("estadísticas", () => {
  it("cuenta eventos por día y suma los totales", async () => {
    await track("visita");
    await track("visita");
    await track("jugadores", 5);
    const now = new Date();
    const rows = await loadStats(3, now);
    expect(rows.map((r) => r.day)[0]).toBe(dayOf(now));
    expect(rows[0]).toMatchObject({ visita: 2, jugadores: 5, mesa: 0 });
    expect(rows[1].visita).toBe(0);
    expect(totalsOf(rows)).toMatchObject({ visita: 2, terminadasPct: null, jugadoresPorPartida: null });
  });

  it("calcula porcentajes y jugadores por partida", () => {
    const day = (partida: number, enserio: number, terminada: number, jugadores: number) =>
      ({ day: "x", mesa: 0, celular: 0, partida, jugadores, enserio, terminada, edad_si: 0, edad_no: 0, visita: 0, vuelve: 0 });
    const t = totalsOf([day(10, 6, 3, 35), day(0, 0, 0, 0)]);
    expect(t).toMatchObject({ enSeriosPct: 60, terminadasPct: 30, jugadoresPorPartida: 3.5 });
  });

  it("cuenta mesa, celular, partida y jugadores al jugar", async () => {
    const { code } = await createRoom();
    const { secret } = await claimControl(code);
    await startRoom(code, secret, CREW);
    expect(await today()).toMatchObject({ mesa: 1, celular: 1, partida: 1, jugadores: 3, enserio: 0, terminada: 0 });
  });

  it("una partida cuenta «en serio» una sola vez al llegar a las tiradas mínimas", async () => {
    const { code } = await createRoom();
    const { secret } = await claimControl(code);
    await startRoom(code, secret, CREW);
    const raw = JSON.parse((await getStore().get(`room:${code}`))!);
    raw.game.rollSeq = SERIOUS_ROLLS - 1;
    await getStore().set(`room:${code}`, JSON.stringify(raw), 3600);
    await actInRoom(code, secret, { type: "ROLL" });
    expect((await today()).enserio).toBe(1);
    // siguientes jugadas (aunque fallen por no ser válidas) no la vuelven a contar
    await actInRoom(code, secret, { type: "NEXT_TURN" }).catch(() => {});
    expect((await today()).enserio).toBe(1);
  });

  it("cuenta «terminada» una vez cuando alguien llega a la meta", async () => {
    const { code } = await createRoom();
    const { secret } = await claimControl(code);
    await startRoom(code, secret, CREW);
    const raw = JSON.parse((await getStore().get(`room:${code}`))!);
    raw.game.players[raw.game.turn].pos = 61; // a un paso de la meta (casilla 62)
    await getStore().set(`room:${code}`, JSON.stringify(raw), 3600);
    const random = vi.spyOn(Math, "random").mockReturnValue(0); // el dado saca 1
    try {
      await actInRoom(code, secret, { type: "ROLL" });
    } finally {
      random.mockRestore();
    }
    expect((await today()).terminada).toBe(1);
    // jugadas posteriores sobre la partida ya terminada no la cuentan otra vez
    await actInRoom(code, secret, { type: "RANKING", on: true }).catch(() => {});
    expect((await today()).terminada).toBe(1);
  });

  it("REINICIAR cuenta una partida nueva y la siguiente ronda no", async () => {
    const { code } = await createRoom();
    const { secret } = await claimControl(code);
    await startRoom(code, secret, CREW);
    await resetRoom(code, secret, true);
    expect(await today()).toMatchObject({ partida: 2, jugadores: 6 });
    await resetRoom(code, secret, true, true);
    expect((await today()).partida).toBe(2);
    await resetRoom(code, secret); // SALIR: vuelve a los jugadores, no es partida
    expect((await today()).partida).toBe(2);
  });

  it("si el almacén falla, track no rompe el juego", async () => {
    const store = getStore();
    const original = store.incr;
    store.incr = async () => {
      throw new Error("caído");
    };
    await expect(track("mesa")).resolves.toBeUndefined();
    store.incr = original;
  });
});
