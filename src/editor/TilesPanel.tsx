"use client";

// Panel de la herramienta "Casillas": cuántas van, cuál es la siguiente y el aspecto (color e icono) de cada
// tipo de casilla. Las reglas de cada número no cambian (src/game/board.ts): aquí solo se decide dónde y cómo se ve.

import { BOARD, TILE_NAMES } from "@/game/board";
import { builtinIcon, ICON_LABELS, ICON_NAMES, iconMaskUrl, iconValue, type IconName } from "./icons";
import {
  lookOf,
  NUMBER_FONTS,
  NUMBER_POSITIONS,
  NUMBER_SIZE,
  TILE_COUNT,
  tileTypeOf,
  type BoardLayout,
  type NumberFont,
  type NumberPosition,
  type NumberStyle,
  type TileKind,
  type TileType,
} from "./layout";

/** Tipos de casilla en el orden en que aparecen en el tablero. */
const TYPES = [...new Set(BOARD.map((t) => t.type))];

/** Achica una imagen subida a 128×128 (webp) para guardarla dentro del diseño. */
async function iconFromFile(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const k = Math.min(S / bmp.width, S / bmp.height);
  ctx.drawImage(bmp, (S - bmp.width * k) / 2, (S - bmp.height * k) / 2, bmp.width * k, bmp.height * k);
  return canvas.toDataURL("image/webp", 0.85);
}

function Swatch({ color, icon, kind, ink, size = 32 }: { color: string; icon: string; kind: TileKind; ink: string; size?: number }) {
  // en carretera: asfalto gris; en vivo: el color del tipo. El icono va de un solo tono.
  const bg = kind === "road" ? "#4a4d54" : color;
  const name = builtinIcon(icon);
  return (
    <span className="grid shrink-0 place-items-center rounded-lg" style={{ background: bg, width: size, height: size }}>
      {name ? (
        <span
          style={{
            width: size * 0.7,
            height: size * 0.7,
            background: ink,
            maskImage: `url(${iconMaskUrl(name)})`,
            WebkitMaskImage: `url(${iconMaskUrl(name)})`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />
      ) : icon.startsWith("data:") ? (
        <img src={icon} alt="" className="h-[75%] w-[75%] object-contain" />
      ) : (
        <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>{icon}</span>
      )}
    </span>
  );
}

export default function TilesPanel({
  layout,
  onChange,
  onUnpublish,
}: {
  layout: BoardLayout;
  onChange: (next: BoardLayout) => void;
  onUnpublish: () => void;
}) {
  const count = layout.tiles.length;
  const next = count < TILE_COUNT ? count + 1 : null;
  const setNumbers = (patch: Partial<NumberStyle>) => onChange({ ...layout, numbers: { ...layout.numbers, ...patch } });
  const nums = layout.numbers;
  const setLook = (type: TileType, patch: { color?: string; icon?: string; kind?: TileKind; iconColor?: string | undefined } | null) => {
    const styles = { ...layout.tileStyles };
    if (patch) styles[type] = { ...styles[type], ...patch };
    else delete styles[type];
    onChange({ ...layout, tileStyles: styles });
  };

  return (
    <div className="grid gap-3 text-sm">
      <div className="rounded-lg bg-white/5 p-2">
        <p className="font-semibold">
          Casillas: {count} / {TILE_COUNT}
        </p>
        {next ? (
          <p className="mt-1 flex items-center gap-2">
            <Swatch {...lookOf(layout, tileTypeOf(next))} size={26} />
            <span>
              Siguiente: <b>{next}</b> · {TILE_NAMES[tileTypeOf(next)]}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-emerald-400">¡Están las 62! Ya puedes publicar en la TV.</p>
        )}
        <p className="mt-2 text-xs leading-relaxed opacity-70">
          Cada casilla ocupa 2×2 cuadros de la rejilla. Clic en el suelo: pone la siguiente. Arrastra para poner varias
          seguidas. Clic en una casilla: la quita (las de después se renumeran).
        </p>
        {count > 0 && (
          <button
            className="mt-2 rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
            onClick={() => window.confirm("¿Quitar todas las casillas? Se puede deshacer.") && onChange({ ...layout, tiles: [] })}
          >
            Quitar todas
          </button>
        )}
      </div>

      <div className="grid gap-2 rounded-lg bg-white/5 p-2">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={nums.show} onChange={(e) => setNumbers({ show: e.target.checked })} />
          Mostrar los números
        </label>
        {nums.show && (
          <>
            <label className="grid gap-1 text-xs">
              <span className="flex justify-between">
                Tamaño <b>{nums.size}</b>
              </span>
              <input
                type="range"
                min={NUMBER_SIZE.min}
                max={NUMBER_SIZE.max}
                step={5}
                value={nums.size}
                onChange={(e) => setNumbers({ size: Number(e.target.value) })}
              />
            </label>
            <label className="grid gap-1 text-xs">
              Tipo de letra
              <select
                value={nums.font}
                onChange={(e) => setNumbers({ font: e.target.value as NumberFont })}
                className="rounded bg-white/10 px-2 py-1 text-sm"
              >
                {(Object.keys(NUMBER_FONTS) as NumberFont[]).map((f) => (
                  <option key={f} value={f} className="bg-[#1c1f27]">
                    {NUMBER_FONTS[f].label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-1 text-xs">
              Posición en la casilla
              <div className="flex flex-wrap gap-1">
                {(Object.keys(NUMBER_POSITIONS) as NumberPosition[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNumbers({ pos: p })}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${nums.pos === p ? "bg-amber-400 text-black" : "bg-white/10 hover:bg-white/20"}`}
                  >
                    {NUMBER_POSITIONS[p]}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs opacity-60">El color del número es el mismo del icono de cada tipo (el círculo de color).</p>
          </>
        )}
      </div>

      <div className="grid gap-1.5">
        <p className="font-semibold">Aspecto de las casillas</p>
        <p className="text-xs opacity-70">
          ✨ Vivo: colores de videojuego, para las importantes. 🛣️ Carretera: asfalto con el icono pintado, para que el
          resto no chille con el escenario.
        </p>
        {TYPES.map((type) => {
          const look = lookOf(layout, type);
          const custom = !!layout.tileStyles[type];
          const small = "rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20";
          return (
            <div key={type} className="grid gap-1.5 rounded-lg bg-white/5 p-1.5">
              <div className="flex items-center gap-2">
                <Swatch {...look} />
                <span className="min-w-0 flex-1 truncate text-sm" title={TILE_NAMES[type]}>
                  {TILE_NAMES[type]}
                </span>
                <button
                  className={small}
                  title={look.kind === "vivid" ? "Vivo (clic: pasar a carretera)" : "Carretera (clic: pasar a vivo)"}
                  onClick={() => setLook(type, { kind: look.kind === "vivid" ? "road" : "vivid" })}
                >
                  {look.kind === "vivid" ? "✨ Vivo" : "🛣️ Carretera"}
                </button>
                {custom && (
                  <button className="rounded px-1 opacity-70 hover:opacity-100" title="Volver al aspecto de serie" onClick={() => setLook(type, null)}>
                    ↺
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1" title="Color de la casilla">
                  <input
                    type="color"
                    value={look.color}
                    onChange={(e) => setLook(type, { color: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  Casilla
                </label>
                <label className="flex items-center gap-1" title="Color del icono y del número">
                  <input
                    type="color"
                    value={look.ink}
                    onChange={(e) => setLook(type, { iconColor: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  />
                  Icono
                </label>
                {look.customInk && (
                  <button className="opacity-70 hover:opacity-100" title="Color del icono automático" onClick={() => setLook(type, { iconColor: undefined })}>
                    Auto
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={builtinIcon(look.icon) ?? ""}
                  onChange={(e) => e.target.value && setLook(type, { icon: iconValue(e.target.value as IconName) })}
                  className="min-w-0 flex-1 rounded bg-white/10 px-1.5 py-1 text-xs"
                  title="Icono"
                >
                  {!builtinIcon(look.icon) && <option value="">Propio</option>}
                  {ICON_NAMES.map((n) => (
                    <option key={n} value={n} className="bg-[#1c1f27]">
                      {ICON_LABELS[n]}
                    </option>
                  ))}
                </select>
                <label className={`cursor-pointer text-xs ${small}`} title="Subir una imagen como icono">
                  ⬆ Subir imagen
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) setLook(type, { icon: await iconFromFile(f) });
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <button className="rounded-lg bg-white/5 px-2 py-1.5 text-xs opacity-70 hover:bg-white/10 hover:opacity-100" onClick={onUnpublish}>
        Quitar mi tablero de la TV (volver al de serie)
      </button>
    </div>
  );
}
