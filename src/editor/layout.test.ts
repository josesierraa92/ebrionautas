import { describe, expect, it } from "vitest";
import { History } from "./history";
import { brushCells, DEFAULT_CHIP, DEFAULT_TV_VIEW, parseChip, expand, flatten, groundAt, lightOf, lookOf, MAX_LEVEL, MAX_SIZE, newLayout, paint, parseLayout, raise, resize, TILE_COUNT, tileAnchor, tileTypeOf, toggleTile, tvDirection } from "./layout";

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

describe("luces de los objetos", () => {
  const obj = (model: string, light?: unknown) => ({ id: "a", model, x: 1, y: 0, z: 1, rx: 0, ry: 0, rz: 0, s: 1, ...(light ? { light } : {}) });
  it("los faroles y las velas brillan por defecto y el resto no", () => {
    expect(lightOf(obj("halloween/lantern_standing") as never)?.on).toBe(true);
    expect(lightOf(obj("cementerio/candle-multiple") as never)?.on).toBe(true);
    expect(lightOf(obj("halloween/pumpkin_orange_jackolantern") as never)?.on).toBe(true);
    expect(lightOf(obj("naturaleza/tree_oak") as never)).toBeNull();
    expect(lightOf(obj("halloween/pumpkin_orange") as never)).toBeNull();
  });
  it("se valida la luz propia y puede apagar la de serie", () => {
    const l = parseLayout({ ...newLayout(10, 8), objects: [obj("halloween/lantern_standing", { on: false, color: "rojo", intensity: 9999, distance: 0 }), obj("naturaleza/tree_oak", { on: true, color: "#00ff88", intensity: 60, distance: 8 })] });
    expect(l?.objects[0].light).toEqual({ on: false, color: "#ffb347", intensity: 200, distance: 2 });
    expect(lightOf(l!.objects[0])?.on).toBe(false);
    expect(lightOf(l!.objects[1])).toEqual({ on: true, color: "#00ff88", intensity: 60, distance: 8 });
  });
});

describe("neblina", () => {
  it("tiene valor de serie, se limita a 0..1 y sobrevive a cambiar el tamaño", () => {
    const base = newLayout(10, 8);
    expect(base.mist).toBe(1);
    expect(parseLayout({ ...base, mist: undefined })?.mist).toBe(1);
    expect(parseLayout({ ...base, mist: 5 })?.mist).toBe(1);
    expect(parseLayout({ ...base, mist: -1 })?.mist).toBe(0);
    expect(resize({ ...base, mist: 0.3 }, 20, 12).mist).toBe(0.3);
  });
});

describe("vista de la TV", () => {
  it("tiene valor de serie (la isométrica), se valida y sobrevive a cambiar el tamaño", () => {
    const base = newLayout(10, 8);
    expect(base.tvView).toEqual(DEFAULT_TV_VIEW);
    expect(parseLayout({ ...base, tvView: undefined })?.tvView).toEqual(DEFAULT_TV_VIEW);
    expect(parseLayout({ ...base, tvView: { az: -90, el: 99, tiles: 1 } })?.tvView).toEqual({ az: 270, el: 80, tiles: 3 });
    expect(resize({ ...base, tvView: { az: 10, el: 50, tiles: 5 } }, 20, 12).tvView).toEqual({ az: 10, el: 50, tiles: 5 });
    // az 45 y el 30 es la dirección isométrica de siempre (1, tan30°·√2, 1)
    const [x, y, z] = tvDirection({ az: 45, el: 30, tiles: 9 });
    expect(x).toBeCloseTo(z);
    expect(y / Math.hypot(x, z)).toBeCloseTo(Math.tan(Math.PI / 6));
    expect(Math.hypot(...tvDirection(DEFAULT_TV_VIEW))).toBeCloseTo(1);
  });
});

describe("tamaño de los personajes", () => {
  it("vale 1 de serie, se limita y sobrevive a cambiar el tamaño del mundo", () => {
    const base = newLayout(10, 8);
    expect(base.characterSize).toBe(1);
    expect(parseLayout({ ...base, characterSize: undefined })?.characterSize).toBe(1);
    expect(parseLayout({ ...base, characterSize: 9 })?.characterSize).toBe(4);
    expect(parseLayout({ ...base, characterSize: 0.1 })?.characterSize).toBe(0.5);
    expect(resize({ ...base, characterSize: 1.4 }, 20, 12).characterSize).toBe(1.4);
    // nombre sobre los personajes: de serie los valores de antes, cada campo en su rango y la letra solo de la lista
    expect(base.names).toEqual({ size: 100, font: "lilita", spacing: -1, bubble: 50, glow: 100, reach: 100 });
    expect(parseLayout({ ...base, names: undefined })?.names).toEqual(base.names);
    expect(parseLayout({ ...base, names: { size: 999, font: "creepster", spacing: -99, bubble: 30, glow: "mucho", reach: 9999 } })?.names).toEqual({ size: 200, font: "creepster", spacing: -10, bubble: 30, glow: 100, reach: 300 });
    expect(parseLayout({ ...base, names: { font: "comic-sans" } })?.names.font).toBe("lilita");
    expect(resize({ ...base, names: { ...base.names, size: 140 } }, 20, 12).names.size).toBe(140);
    // tamaño de la interfaz de la TV: 100 % de serie, entre 50 y 180
    expect(base.ui).toEqual({ card: 100, chip: 100 });
    expect(parseLayout({ ...base, ui: undefined })?.ui).toEqual({ card: 100, chip: 100 });
    expect(parseLayout({ ...base, ui: { card: 999, chip: 10 } })?.ui).toEqual({ card: 180, chip: 50 });
    expect(parseLayout({ ...base, ui: { card: "grande", chip: 120 } })?.ui).toEqual({ card: 100, chip: 120 });
    expect(resize({ ...base, ui: { card: 130, chip: 80 } }, 20, 12).ui).toEqual({ card: 130, chip: 80 });
  });
});

describe("fichas de los jugadores", () => {
  it("hay una por color de jugador, vacías por defecto, y se validan", () => {
    const base = newLayout(10, 8);
    expect(base.tokens).toHaveLength(16);
    expect(base.tokens.every((t) => t === null)).toBe(true);
    const tokens = [{ model: "mios/robot", size: 9, turn: -90, base: false }, { model: "../x" }, null, "hola"];
    const l = parseLayout({ ...base, tokens });
    expect(l?.tokens).toHaveLength(16);
    expect(l?.tokens[0]).toEqual({ model: "mios/robot", size: 2.5, turn: 270, base: false });
    expect(l?.tokens.slice(1).every((t) => t === null)).toBe(true);
    expect(parseLayout({ ...base, tokens: undefined })?.tokens).toHaveLength(16);
    // un diseño guardado con 8 fichas sigue valiendo (se completa con las nuevas)
    expect(parseLayout({ ...base, tokens: Array(8).fill(null) })?.tokens).toHaveLength(16);
    expect(resize({ ...base, tokens: l!.tokens }, 20, 12).tokens).toEqual(l!.tokens);
  });
});

describe("ampliar el mundo", () => {
  const base = () => {
    let l = paint(newLayout(10, 8), 0, 0, 1, "water");
    l = raise(l, 9, 7, 1, 3);
    return { ...l, tiles: [{ x: 2, y: 2 }], objects: [{ id: "a", model: "cementerio/grave", x: 3.5, y: 0.5, z: 4.5, rx: 0, ry: 0, rz: 0, s: 1 }] };
  };
  it("por el lado + no mueve nada y continúa el terreno del borde", () => {
    const l = expand(base(), "x+", 5);
    expect([l.w, l.h]).toEqual([15, 8]);
    expect(l.objects[0].x).toBe(3.5);
    expect(l.tiles[0]).toEqual({ x: 2, y: 2 });
    expect(l.height[7 * 15 + 14]).toBe(5); // el borde (2 + 3 de altura) se repite en lo nuevo
    expect(l.ground[0]).toBe("water");
  });
  it("por el lado - corre las casillas y los objetos", () => {
    const l = expand(expand(base(), "x-", 4), "z-", 3);
    expect([l.w, l.h]).toEqual([14, 11]);
    expect(l.tiles[0]).toEqual({ x: 6, y: 5 });
    expect(l.objects[0].x).toBe(7.5);
    expect(l.objects[0].z).toBe(7.5);
    expect(l.ground[3 * 14 + 4]).toBe("water"); // el agua de la esquina viajó con todo
    expect(l.ground[0]).toBe("water"); // y la esquina nueva continúa el agua
  });
  it("respeta el máximo y no cambia nada si no cabe", () => {
    expect(expand(base(), "z+", 500).h).toBe(MAX_SIZE);
    const full = expand(base(), "z+", 500);
    expect(expand(full, "z+", 4)).toBe(full);
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

describe("tarjeta de usuario (chip)", () => {
  it("de serie vale lo de siempre y se guarda con el diseño", () => {
    const l = newLayout(10, 8);
    expect(l.chip).toEqual(DEFAULT_CHIP);
    const back = parseLayout(JSON.parse(JSON.stringify({ ...l, chip: { ...l.chip, cupSize: 150, cupColor: "#ff0000" } })));
    expect(back?.chip.cupSize).toBe(150);
    expect(back?.chip.cupColor).toBe("#ff0000");
  });
  it("valida rangos, colores y letra; un diseño viejo sin `chip` queda de serie", () => {
    expect(parseChip({ cupSize: 9999, outline: -5, cupColor: "rojo", icon: "mal nombre!", font: "inventada", zombie: 100.4 })).toMatchObject({ icon: DEFAULT_CHIP.icon, gap: DEFAULT_CHIP.gap, cupSize: 250, outline: 0, cupColor: DEFAULT_CHIP.cupColor, font: "lilita", zombie: 100 });
    const l = newLayout(10, 8) as unknown as Record<string, unknown>;
    delete l.chip;
    expect(parseLayout(JSON.parse(JSON.stringify(l)))?.chip).toEqual(DEFAULT_CHIP);
  });
});
