import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, DEFAULT_JUICIO, DEFAULT_NICKNAMES, DEFAULT_RETOS, DEFAULT_RONDA, RETO_ORIGINALS } from "@/game/content";
import { loadLists, saveLists } from "./lists";
import { getStore, resetMemoryStore } from "./store";

beforeEach(() => resetMemoryStore());

describe("listas editables guardadas como diferencia", () => {
  it("sin nada guardado salen las del código", async () => {
    const l = await loadLists();
    expect(l.retos).toEqual(DEFAULT_RETOS);
    expect(l.categories).toEqual(DEFAULT_CATEGORIES);
  });

  it("lo que el admin añade y borra en el editor se queda, y lo que se añade al código se suma", async () => {
    const editada = DEFAULT_RETOS.slice(1).concat("Mi reto propio.");
    await saveLists({ retos: editada });
    // simula que el código cambió después: la guardada solo recuerda sus añadidos y borrados
    const l = await loadLists();
    expect(l.retos).toContain("Mi reto propio.");
    expect(l.retos).not.toContain(DEFAULT_RETOS[0]);
    const raw = JSON.parse((await getStore().get("cards:retos"))!);
    expect(raw).toMatchObject({ v: 4, added: ["Mi reto propio."], removed: [DEFAULT_RETOS[0]] });
  });

  it("borrar sin añadir nada se queda borrado (antes volvía a aparecer)", async () => {
    const sinUno = DEFAULT_RETOS.filter((x) => x !== DEFAULT_RETOS[3]);
    await saveLists({ retos: sinUno });
    const l = await loadLists();
    expect(l.retos).toEqual(sinUno);
    expect(l.retos).not.toContain(DEFAULT_RETOS[3]);
    // y lo mismo si borra varias líneas de otra lista
    await saveLists({ juicio: DEFAULT_JUICIO.slice(5) });
    expect((await loadLists()).juicio).toEqual(DEFAULT_JUICIO.slice(5));
  });

  it("borrar más de la mitad de la serie y añadir uno propio se respeta (apodos)", async () => {
    const mine = [...DEFAULT_NICKNAMES.slice(8), "Pepe"];
    await saveLists({ nicknames: mine });
    expect((await loadLists()).nicknames).toEqual(mine);
    await saveLists({ nicknames: [...mine, "Lalo"] });
    expect((await loadLists()).nicknames).toEqual([...mine, "Lalo"]);
    await saveLists({ nicknames: ["Solo"] });
    expect((await loadLists()).nicknames).toEqual(["Solo"]);
    await saveLists({ ronda: [...DEFAULT_RONDA.slice(12), "Mío"] });
    expect((await loadLists()).ronda).toEqual([...DEFAULT_RONDA.slice(12), "Mío"]);
  });

  it("guardar la lista de serie tal cual no deja nada fijado (los cambios del código siguen llegando)", async () => {
    await saveLists({ juicio: DEFAULT_JUICIO });
    const raw = JSON.parse((await getStore().get("cards:juicio"))!);
    expect(raw).toMatchObject({ added: [], removed: [] });
  });

  it("formato viejo (lista entera): se rescatan los añadidos del admin y no se pierde la lista aunque la redacción de serie haya cambiado", async () => {
    // una lista vieja con la redacción de antes (textos que fueron de serie) y un reto que escribió el admin
    const vieja = [...RETO_ORIGINALS["Cómicos"], ...RETO_ORIGINALS["Corleone"], "Reto que escribió el admin."];
    await getStore().set("cards:retos", JSON.stringify(vieja), 100);
    const l = await loadLists();
    expect(l.retos).toContain("Reto que escribió el admin.");
    expect(l.retos).toEqual(expect.arrayContaining(DEFAULT_RETOS)); // las de serie siguen todas
    expect(l.retos.length).toBe(DEFAULT_RETOS.length + 1);
  });

  it("una lista vieja de solo 2 líneas no deja la lista en 2", async () => {
    await getStore().set("cards:ronda", JSON.stringify(DEFAULT_RONDA.slice(0, 2)), 100);
    expect((await loadLists()).ronda).toHaveLength(DEFAULT_RONDA.length);
  });
});
