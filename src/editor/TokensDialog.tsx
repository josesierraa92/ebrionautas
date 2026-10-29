"use client";

// Ventana de las fichas: arriba, los personajes zombi que usa el juego (hombres para los hombres, mujeres para las
// mujeres) dibujados con el ángulo de la TV y su tamaño en el tablero; abajo, el modelo propio de cada color de
// jugador (la que no se cambia sigue siendo el personaje zombi). Al publicar, todo se dibuja con la cámara de la TV.
import { useEffect, useMemo, useState } from "react";
import { CHARACTER_HEIGHT, CHARACTERS, FEMALE, MALE, SHEET_COLS, TOKEN_TO_TILE } from "@/game/characters";
import { PLAYER_COLORS } from "@/game/tileStyle";
import type { Catalog } from "./catalogTypes";
import { renderCharacterSheet } from "./characterSheet";
import { loadModelScene, renderToken } from "./modelRender";
import { CHARACTER_SIZE, DEFAULT_NAMES, DEFAULT_TOKEN, NAME_LIMITS, NUMBER_FONTS, TOKEN_SIZE, nameCssVars, type BoardLayout, type NameStyle, type NumberFont, type TokenSpec, type TvView } from "./layout";

/** Ajustes del nombre que flota sobre cada personaje, con una vista previa que usa el mismo CSS (`.live-name`) que el tablero. */
function NamesSection({ names, onChange }: { names: NameStyle; onChange: (n: NameStyle) => void }) {
  const set = (patch: Partial<NameStyle>) => onChange({ ...names, ...patch });
  const slider = (label: string, key: "size" | "spacing" | "bubble" | "glow" | "reach", unit: string, step: number) => (
    <label className="grid gap-0.5 text-sm">
      <span className="flex justify-between">
        {label}{" "}
        <b>
          {names[key]}
          {unit}
        </b>
      </span>
      <input type="range" min={NAME_LIMITS[key].min} max={NAME_LIMITS[key].max} step={step} value={names[key]} onChange={(e) => set({ [key]: Number(e.target.value) })} />
    </label>
  );
  const vars = nameCssVars(names) as React.CSSProperties;
  return (
    <section className="flex gap-4 rounded-xl bg-white/5 p-3">
      {/* vista previa: el mismo CSS que el tablero, a tamaño de ejemplo sobre un fondo de escenario */}
      <div className="grid h-40 w-64 shrink-0 place-items-center rounded-xl bg-[#1d3a2a]" style={vars}>
        <div className="relative h-24 w-full">
          {[
            ["ALEJO", "#ff3fd0", "30%"],
            ["VANE", "#3ba0ff", "72%"],
          ].map(([n, c, left]) => (
            <div key={n} className="live-name" style={{ left, top: 18, fontSize: 20 * (names.size / 100), transform: "translateX(-50%)", ["--c" as string]: c }}>
              {n}
            </div>
          ))}
        </div>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2">
        <p className="col-span-2 text-sm">
          <b>Nombre sobre el personaje</b> · cómo se ven los nombres que flotan encima de las fichas en la TV (burbuja negra con el nombre en blanco y una flechita neón del color de cada jugador).
        </p>
        {slider("Tamaño", "size", " %", 5)}
        <label className="grid gap-0.5 text-sm">
          Tipo de letra
          <select value={names.font} onChange={(e) => set({ font: e.target.value as NumberFont })} className="rounded bg-white/10 px-2 py-1 text-sm">
            {(Object.keys(NUMBER_FONTS) as NumberFont[]).map((f) => (
              <option key={f} value={f} className="bg-[#1c1f27]">
                {NUMBER_FONTS[f].label}
              </option>
            ))}
          </select>
        </label>
        {slider("Espaciado entre letras", "spacing", " cent. de em", 1)}
        {slider("Opacidad de la burbuja negra", "bubble", " %", 5)}
        {slider("Fuerza del neón de la flecha (cuánto brilla)", "glow", " %", 10)}
        {slider("Alcance del neón de la flecha (hasta dónde llega)", "reach", " %", 10)}
        <button className="col-span-1 self-end rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20" onClick={() => onChange(DEFAULT_NAMES)}>
          Volver a los valores de serie
        </button>
      </div>
    </section>
  );
}

type Sheet = { url: string; cw: number; ch: number; feet: number; span: number; portraits: string[] };

/** Hoja de personajes con el ángulo de la TV (se dibuja al abrir la ventana y cuando cambia la vista). */
function useSheet(view: TvView): Sheet | null {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const key = `${view.az}|${view.el}`;
  useEffect(() => {
    let alive = true;
    setSheet(null);
    renderCharacterSheet(view)
      .then(({ canvas, feet, span }) => {
        if (!alive) return;
        const cw = canvas.width / SHEET_COLS;
        const ch = canvas.height / CHARACTERS.length;
        // retrato de cada uno: de frente, quieto, recortado a su altura
        const top = Math.max(0, (feet - 1.05 / span) * ch);
        const bottom = Math.min(ch, (feet + 0.05) * ch);
        const portraits = CHARACTERS.map((_, row) => {
          const c = document.createElement("canvas");
          c.width = cw;
          c.height = bottom - top;
          c.getContext("2d")!.drawImage(canvas, 0, row * ch + top, cw, bottom - top, 0, 0, cw, bottom - top);
          return c.toDataURL("image/png");
        });
        setSheet({ url: canvas.toDataURL("image/png"), cw, ch, feet, span, portraits });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return sheet;
}

/** Una casilla vista con el ángulo de la TV y un personaje encima, del tamaño que tendrá en el tablero. */
function SizePreview({ sheet, view, size, row }: { sheet: Sheet; view: TvView; size: number; row: number }) {
  const W = 210; // ancho de la casilla en la vista previa
  const H = W * Math.sin((view.el * Math.PI) / 180);
  const charH = W * TOKEN_TO_TILE * CHARACTER_HEIGHT * size;
  const h = charH * sheet.span;
  const w = (h * sheet.cw) / sheet.ch;
  const cy = 150;
  return (
    <div className="relative h-48 w-64 shrink-0 overflow-hidden rounded-xl bg-[#11141b]">
      <div
        className="absolute"
        style={{ left: 128 - W / 2, top: cy - H / 2, width: W, height: H, clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)", background: "linear-gradient(#3a3f4f, #2a2e3a)" }}
      />
      <div
        className="absolute"
        style={{
          left: 128 - w / 2,
          top: cy - h * sheet.feet,
          width: w,
          height: h,
          backgroundImage: `url(${sheet.url})`,
          backgroundSize: `${w * SHEET_COLS}px ${h * CHARACTERS.length}px`,
          backgroundPosition: `0 ${-row * h}px`,
        }}
      />
    </div>
  );
}

export default function TokensDialog({
  layout,
  catalog,
  onChange,
  onClose,
}: {
  layout: BoardLayout;
  catalog: Catalog;
  onChange: (next: BoardLayout) => void;
  onClose: () => void;
}) {
  const [slot, setSlot] = useState(0);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [kit, setKit] = useState("todos");
  const [search, setSearch] = useState("");
  const sheet = useSheet(layout.tvView);
  const [pick, setPick] = useState(0); // personaje de la vista previa de tamaño
  const models = useMemo(() => new Map(catalog.models.map((m) => [m.id, m])), [catalog]);
  const spec = layout.tokens[slot];

  const setSpec = (i: number, next: TokenSpec | null) => {
    const tokens = layout.tokens.slice();
    tokens[i] = next;
    onChange({ ...layout, tokens });
  };

  // dibuja la vista previa de cada ficha propia (se vuelve a dibujar solo si cambia algo de ella)
  const keyOf = (i: number, t: TokenSpec) => `${i}|${t.model}|${t.turn}|${t.base}`;
  useEffect(() => {
    let alive = true;
    layout.tokens.forEach((t, i) => {
      if (!t) return;
      const key = keyOf(i, t);
      if (previews[key]) return;
      const file = models.get(t.model)?.file;
      if (!file) return;
      loadModelScene(file)
        .then((root) => {
          if (alive) setPreviews((p) => ({ ...p, [key]: renderToken(root, t, PLAYER_COLORS[i]) }));
        })
        .catch(() => undefined);
    });
    return () => {
      alive = false;
    };
  }, [layout.tokens, models, previews]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.models.filter((m) => (kit === "todos" || m.kit === kit) && (!q || m.name.toLowerCase().includes(q)));
  }, [catalog, kit, search]);

  const imageOf = (i: number) => {
    const t = layout.tokens[i];
    return (t && previews[keyOf(i, t)]) || (t ? "" : (sheet?.portraits[i % CHARACTERS.length] ?? ""));
  };
  const btn = "rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors";
  const on = "bg-amber-400 text-black";
  const off = "bg-white/10 hover:bg-white/20";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-5xl flex-col gap-3 overflow-hidden rounded-2xl bg-[#1c1f27] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-amber-400">🧟 Fichas de los jugadores</h2>
          <button className={`${btn} ${off}`} onClick={onClose}>
            Cerrar
          </button>
        </div>
        {/* personajes zombi del juego y su tamaño en el tablero */}
        <section className="flex gap-4 rounded-xl bg-white/5 p-3">
          {sheet ? (
            <SizePreview sheet={sheet} view={layout.tvView} size={layout.characterSize} row={pick} />
          ) : (
            <div className="grid h-48 w-64 shrink-0 place-items-center rounded-xl bg-[#11141b] text-xs opacity-60">dibujando a los zombis…</div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm">
              <b>Personajes zombi</b> · los hombres juegan con uno de hombre y las mujeres con uno de mujer, en orden de entrada.
              Se ven con el ángulo de tu vista de la TV y miran hacia donde caminan.
            </p>
            <div className="grid grid-cols-12 gap-1">
              {CHARACTERS.map((id, i) => (
                <button
                  key={id}
                  title={`${i < MALE.length ? "Hombre" : "Mujer"} ${(i % 6) + 1}`}
                  onClick={() => setPick(i)}
                  className={`grid h-16 place-items-end rounded-lg p-0.5 ${pick === i ? "bg-amber-400/20 ring-2 ring-amber-400" : "bg-white/5 hover:bg-white/10"}`}
                >
                  {sheet && <img src={sheet.portraits[i]} alt="" className="max-h-full object-contain" />}
                </button>
              ))}
            </div>
            <p className="text-[11px] opacity-60">
              {MALE.length} hombres · {FEMALE.length} mujeres (con más de {MALE.length} de un mismo género se repiten).
            </p>
            <label className="grid gap-0.5 text-sm">
              <span className="flex justify-between">
                Tamaño en el tablero <b>{layout.characterSize.toFixed(2)}×</b>
              </span>
              <input
                type="range"
                min={CHARACTER_SIZE.min * 100}
                max={CHARACTER_SIZE.max * 100}
                step={5}
                value={layout.characterSize * 100}
                onChange={(e) => onChange({ ...layout, characterSize: Number(e.target.value) / 100 })}
              />
            </label>
          </div>
        </section>

        <NamesSection names={layout.names} onChange={(names) => onChange({ ...layout, names })} />

        <p className="text-sm opacity-70">
          Fichas propias (opcional): elige un modelo del catálogo (o uno tuyo) para el color de un jugador; las que no
          cambies siguen siendo el personaje zombi. Se publican junto con el tablero.
        </p>

        <div className="flex min-h-0 flex-1 gap-4">
          {/* las 8 fichas */}
          <div className="grid w-72 shrink-0 grid-cols-3 content-start gap-2 overflow-y-auto pr-1">
            {PLAYER_COLORS.map((color, i) => (
              <button
                key={color}
                onClick={() => setSlot(i)}
                className={`flex flex-col items-center rounded-xl p-2 ${slot === i ? "bg-amber-400/20 ring-2 ring-amber-400" : "bg-white/5 hover:bg-white/10"}`}
              >
                <span className="grid h-20 w-full place-items-end">
                  {imageOf(i) ? <img src={imageOf(i)} alt="" className="max-h-20 object-contain" /> : <span className="mb-8 text-xs opacity-60">dibujando…</span>}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-xs">
                  <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                  Ficha {i + 1}
                  {layout.tokens[i] ? " ★" : ""}
                </span>
              </button>
            ))}
          </div>

          {/* la elegida */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
            <div className="flex gap-4">
              <div className="grid h-52 w-40 shrink-0 place-items-end rounded-xl bg-white/5 p-2">
                {imageOf(slot) ? <img src={imageOf(slot)} alt="" className="max-h-full object-contain" /> : <span className="self-center text-xs opacity-60">dibujando…</span>}
              </div>
              <div className="grid flex-1 content-start gap-2 text-sm">
                <p className="font-semibold">
                  Ficha {slot + 1} · {spec ? (models.get(spec.model)?.name ?? spec.model) : "personaje zombi"}
                </p>
                {spec ? (
                  <>
                    <label className="grid gap-0.5 text-xs">
                      <span className="flex justify-between">
                        Giro <b>{spec.turn}°</b>
                      </span>
                      <input type="range" min={0} max={359} value={spec.turn} onChange={(e) => setSpec(slot, { ...spec, turn: Number(e.target.value) })} />
                    </label>
                    <label className="grid gap-0.5 text-xs">
                      <span className="flex justify-between">
                        Tamaño en la TV <b>{spec.size.toFixed(1)}×</b>
                      </span>
                      <input
                        type="range"
                        min={TOKEN_SIZE.min * 10}
                        max={TOKEN_SIZE.max * 10}
                        value={spec.size * 10}
                        onChange={(e) => setSpec(slot, { ...spec, size: Number(e.target.value) / 10 })}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={spec.base} onChange={(e) => setSpec(slot, { ...spec, base: e.target.checked })} />
                      Peana del color del jugador (así se distingue de las demás)
                    </label>
                    <button className={`${btn} ${off} justify-self-start`} onClick={() => setSpec(slot, null)}>
                      Volver al personaje zombi
                    </button>
                  </>
                ) : (
                  <p className="text-xs opacity-70">Elige un modelo de la lista de abajo para esta ficha.</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {[{ id: "todos", label: "Todos" }, ...catalog.kits].map((k) => (
                  <button key={k.id} className={`${btn} px-2 py-1 text-xs ${kit === k.id ? on : off}`} onClick={() => setKit(k.id)}>
                    {k.label}
                  </button>
                ))}
                <input placeholder="Buscar…" className="ml-auto rounded-md bg-white/10 px-2 py-1 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto">
                {visible.map((m) => (
                  <button
                    key={m.id}
                    title={m.name}
                    onClick={() => setSpec(slot, { ...DEFAULT_TOKEN, ...(spec && { size: spec.size, turn: spec.turn, base: spec.base }), model: m.id })}
                    className={`rounded-lg bg-white/5 p-1 hover:bg-white/15 ${spec?.model === m.id ? "ring-2 ring-amber-400" : ""}`}
                  >
                    <img src={m.thumb} alt={m.name} loading="lazy" className="aspect-square w-full" />
                    <span className="block truncate text-[10px] opacity-70">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
