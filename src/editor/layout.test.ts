import { describe, expect, it } from "vitest";
import { History } from "./history";
import { brushCells, flatten, groundAt, lookOf, MAX_LEVEL, newLayout, paint, parseLayout, raise, resize, TILE_COUNT, tileAnchor, tileTypeOf, toggleTile } from "./layout";

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

describe("casillas del juego", () => {
  it("se ponen en orden y al quitar una se renumeran las siguientes", () => {
    let l = newLayout(10, 8);
    l = toggleTile(l, 1, 1);
    l = toggleTile(l, 3, 1);
    l = toggleTile(l, 5, 1);
    expect(l.tiles).toEqual([{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 }]);
    // cada casilla ocupa 2×2: no se puede poner otra pisándola
    expect(toggleTile(l, 2, 2, "add")).toBe(l);
    l = toggleTile(l, 3, 1);
    expect(l.tiles).toEqual([{ x: 1, y: 1 }, { x: 5, y: 1 }]);
    expect(toggleTile(l, 7, 5, "remove")).toBe(l);
    // no se sale del mundo
    expect(toggleTile(l, 9, 0)).toBe(l);
    expect(tileAnchor(l, 9.9, 0.1)).toEqual({ x: 8, y: 0 });
  });

  it("no pasa de 62", () => {
    let l = newLayout(10, 8);
    l = resize(l, 40, 40);
    for (let i = 0; i < 80; i++) l = toggleTile(l, (i % 20) * 2, Math.floor(i / 20) * 2);
    expect(l.tiles).toHaveLength(TILE_COUNT);
    expect(tileTypeOf(1)).toBe("SALIDA");
    expect(tileTypeOf(TILE_COUNT)).toBe("META");
  });

  it("valida los estilos de casilla", () => {
    const l = parseLayout({
      ...newLayout(10, 8),
      tiles: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 99, y: 1 }],
      tileStyles: { OCA: { color: "#123456", icon: "🦇", kind: "road" }, DUELO: { color: "rojo", icon: "<script>".repeat(5) }, NADA: { icon: "x" } },
    });
    expect(l?.tiles).toEqual([{ x: 1, y: 1 }]);
    expect(l?.tileStyles).toEqual({ OCA: { color: "#123456", icon: "🦇", kind: "road" }, DUELO: {} });
    expect(lookOf(l!, "OCA")).toMatchObject({ color: "#123456", icon: "🦇", kind: "road", customInk: false });
    // el color del icono se puede elegir; si no, sale automático
    const inked = parseLayout({ ...newLayout(10, 8), tileStyles: { OCA: { iconColor: "#ff00aa" }, DUELO: { iconColor: "rojo" } } });
    expect(lookOf(inked!, "OCA")).toMatchObject({ ink: "#ff00aa", customInk: true });
    expect(lookOf(inked!, "DUELO").customInk).toBe(false);
    expect(lookOf(inked!, "SALIDA").ink).toBe("#ffffff");
    expect(lookOf(inked!, "META").ink).toBe("#2b2140");
    expect(lookOf(l!, "DUELO").icon).toBe("i:skull");
    // por defecto: las importantes en colores vivos y el resto estilo carretera
    expect(lookOf(l!, "SALIDA").kind).toBe("vivid");
    expect(lookOf(l!, "A_BEBER").kind).toBe("road");
  });
});

describe("números de las casillas", () => {
  it("tienen valores de serie y se validan", () => {
    const base = newLayout(10, 8);
    expect(parseLayout({ ...base, numbers: undefined })?.numbers).toEqual({ show: true, size: 130, font: "lilita", pos: "front" });
    const l = parseLayout({ ...base, numbers: { show: false, size: 9999, font: "creepster", pos: "center" } });
    expect(l?.numbers).toEqual({ show: false, size: 260, font: "creepster", pos: "center" });
    expect(parseLayout({ ...base, numbers: { font: "comic-sans", pos: "arriba", size: "grande" } })?.numbers).toEqual(base.numbers);
    expect(resize(l!, 20, 12).numbers).toEqual(l!.numbers);
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
