import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, DEFAULT_JUICIO, DEFAULT_RETOS } from "@/game/content";
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

  it("guardar la lista de serie tal cual no deja nada fijado (los cambios del código siguen llegando)", async () => {
    await saveLists({ juicio: DEFAULT_JUICIO });
    const raw = JSON.parse((await getStore().get("cards:juicio"))!);
    expect(raw).toMatchObject({ added: [], removed: [] });
  });

  it("formato viejo (lista entera): se conservan sus añadidos y borrados, pero no las cartas de serie que ya se quitaron del código", async () => {
    const vieja = DEFAULT_RETOS.slice(2).concat("Quien tenga un pariente en la mesa bebe 3 vasos.", "Reto que escribió el admin.");
    await getStore().set("cards:retos", JSON.stringify(vieja), 100);
    const l = await loadLists();
    expect(l.retos).toContain("Reto que escribió el admin.");
    expect(l.retos).not.toContain("Quien tenga un pariente en la mesa bebe 3 vasos."); // era de serie (texto viejo)
    expect(l.retos).not.toContain(DEFAULT_RETOS[0]); // lo había borrado
    expect(l.retos).not.toContain(DEFAULT_RETOS[1]);
  });
});
