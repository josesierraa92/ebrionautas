"use client";

// Ventana para elegir el modelo de cada una de las 8 fichas de los jugadores (una por color). La que no se cambia
// sigue siendo el zombi de serie. Al publicar, cada ficha propia se dibuja con la cámara de la TV (modelRender.ts).
import { useEffect, useMemo, useState } from "react";
import { PLAYER_COLORS, alienArt } from "@/game/tileStyle";
import type { Catalog } from "./catalogTypes";
import { loadModelScene, renderToken } from "./modelRender";
import { DEFAULT_TOKEN, TOKEN_SIZE, type BoardLayout, type TokenSpec } from "./layout";

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
    return (t && previews[keyOf(i, t)]) || (t ? "" : (alienArt(PLAYER_COLORS[i]) ?? ""));
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
        <p className="text-sm opacity-70">
          Cada color de jugador tiene su ficha. Elige un modelo del catálogo (o uno tuyo) para cambiarla; las que no cambies
          siguen siendo el zombi de serie. Se publican junto con el tablero.
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
                  Ficha {slot + 1} · {spec ? (models.get(spec.model)?.name ?? spec.model) : "zombi de serie"}
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
                      Volver al zombi de serie
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
