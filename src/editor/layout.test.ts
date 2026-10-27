import { describe, expect, it } from "vitest";
import { History } from "./history";
import { brushCells, flatten, groundAt, MAX_LEVEL, newLayout, paint, parseLayout, raise, resize } from "./layout";

describe("diseño del tablero", () => {
  it("el pincel pinta un cuadrado y no se sale del mundo", () => {
    const l = newLayout(10, 8);
    expect(brushCells(l, 5, 5, 3)).toHaveLength(9);
    expect(brushCells(l, 0, 0, 3)).toHaveLength(4);
    const p = paint(l, 0, 0, 3, "water");
    expect(p.ground.filter((g) => g === "water")).toHaveLength(4);
    expect(l.ground.every((g) => g === "grass")).toBe(true);
  });

  it("pintar lo mismo no crea un diseño nuevo", () => {
    const l = newLayout(10, 8);
    expect(paint(l, 2, 2, 1, "grass")).toBe(l);
  });

  it("subir y bajar el terreno respeta los límites", () => {
    let l = newLayout(10, 8);
    for (let k = 0; k < 40; k++) l = raise(l, 3, 3, 1, 1);
    expect(l.height[3 * 10 + 3]).toBe(MAX_LEVEL);
    for (let k = 0; k < 40; k++) l = raise(l, 3, 3, 1, -1);
    expect(l.height[3 * 10 + 3]).toBe(0);
    l = flatten(l, 3, 3, 3, 5);
    expect(l.height[2 * 10 + 2]).toBe(5);
  });

  it("el agua queda más baja que el suelo de al lado", () => {
    const l = paint(newLayout(10, 8), 4, 4, 1, "water");
    expect(groundAt(l, 4.5, 4.5)).toBeLessThan(groundAt(l, 5.5, 4.5));
  });

  it("cambiar el tamaño conserva lo pintado", () => {
    const l = resize(paint(newLayout(10, 8), 1, 1, 1, "sand"), 20, 12);
    expect(l.w).toBe(20);
    expect(l.ground[1 * 20 + 1]).toBe("sand");
    expect(l.ground).toHaveLength(240);
  });

  it("valida diseños importados", () => {
    const l = { ...newLayout(10, 8), objects: [{ id: "a", model: "cementerio/grave", x: 1, y: 0, z: 2, rx: 0, ry: 1, rz: 0, s: 1 }] };
    expect(parseLayout(JSON.parse(JSON.stringify(l)))).toEqual(l);
    expect(parseLayout({ ...l, w: 3 })).toBeNull();
    expect(parseLayout({ ...l, ground: [] })).toBeNull();
    expect(parseLayout("hola")).toBeNull();
    const bad = parseLayout({ ...l, objects: [{ model: "../../etc" }, { model: "naturaleza/tree_oak", s: 999 }] });
    expect(bad?.objects).toHaveLength(1);
    expect(bad?.objects[0].s).toBe(20);
  });
});

describe("deshacer", () => {
  it("deshace y rehace en orden", () => {
    const h = new History<number>();
    h.push(1);
    h.push(2);
    expect(h.undo(3)).toBe(2);
    expect(h.undo(2)).toBe(1);
    expect(h.undo(1)).toBeNull();
    expect(h.redo(1)).toBe(2);
    h.push(2);
    expect(h.canRedo).toBe(false);
  });
});
