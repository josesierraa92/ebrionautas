import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, DEFAULT_RETOS } from "@/game/content";
import { loadLists, saveLists } from "./lists";
import { getStore, resetMemoryStore } from "./store";

beforeEach(() => resetMemoryStore());

describe("listas editables guardadas", () => {
  it("una lista reorganizada guardada antes (formato viejo) se ignora y sale la del código; las demás se respetan", async () => {
    await getStore().set("cards:retos", JSON.stringify(["Un reto viejo que ya no va"]), 100);
    await getStore().set("cards:categories", JSON.stringify(["mis categorías"]), 100);
    const l = await loadLists();
    expect(l.retos).toEqual(DEFAULT_RETOS);
    expect(l.categories).toEqual(["mis categorías"]);
    expect(l.categories).not.toEqual(DEFAULT_CATEGORIES);
  });

  it("lo que se guarda ahora con «Guardar» sí vale", async () => {
    await saveLists({ retos: ["Mi reto nuevo."] });
    expect((await loadLists()).retos).toEqual(["Mi reto nuevo."]);
  });
});
