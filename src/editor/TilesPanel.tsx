"use client";

// Panel de la herramienta "Casillas": cuántas van, cuál es la siguiente y el aspecto (color e icono) de cada
// tipo de casilla. Las reglas de cada número no cambian (src/game/board.ts): aquí solo se decide dónde y cómo se ve.

import { BOARD, TILE_NAMES } from "@/game/board";
import { builtinIcon, ICON_LABELS, ICON_NAMES, iconMaskUrl, iconValue, type IconName } from "./icons";
import { lookOf, TILE_COUNT, tileTypeOf, type BoardLayout, type TileKind, type TileType } from "./layout";

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

function Swatch({ color, icon, kind, size = 32 }: { color: string; icon: string; kind: TileKind; size?: number }) {
  // en carretera: asfalto gris; en vivo: el color del tipo. El icono va de un solo tono.
  const bg = kind === "road" ? "#4a4d54" : color;
  const ink = kind === "road" ? color : "#ffffff";
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
  const setLook = (type: TileType, patch: { color?: string; icon?: string; kind?: TileKind } | null) => {
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

      <div className="grid gap-1.5">
        <p className="font-semibold">Aspecto de las casillas</p>
        <p className="text-xs opacity-70">
          ✨ Vivo: colores de videojuego, para las importantes. 🛣️ Carretera: asfalto con el icono pintado, para que el
          resto no chille con el escenario.
        </p>
        {TYPES.map((type) => {
          const look = lookOf(layout, type);
          const custom = !!layout.tileStyles[type];
          return (
            <div key={type} className="flex items-center gap-1.5 rounded-lg bg-white/5 p-1">
              <Swatch {...look} />
              <span className="min-w-0 flex-1 truncate text-xs" title={TILE_NAMES[type]}>
                {TILE_NAMES[type]}
              </span>
              <button
                className="rounded bg-white/10 px-1 py-0.5 hover:bg-white/20"
                title={look.kind === "vivid" ? "Vivo (clic: pasar a carretera)" : "Carretera (clic: pasar a vivo)"}
                onClick={() => setLook(type, { kind: look.kind === "vivid" ? "road" : "vivid" })}
              >
                {look.kind === "vivid" ? "✨" : "🛣️"}
              </button>
              <input
                type="color"
                value={look.color}
                onChange={(e) => setLook(type, { color: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Color"
              />
              <select
                value={builtinIcon(look.icon) ?? ""}
                onChange={(e) => e.target.value && setLook(type, { icon: iconValue(e.target.value as IconName) })}
                className="w-20 rounded bg-white/10 px-1 py-0.5 text-xs"
                title="Icono"
              >
                {!builtinIcon(look.icon) && <option value="">Propio</option>}
                {ICON_NAMES.map((n) => (
                  <option key={n} value={n} className="bg-[#1c1f27]">
                    {ICON_LABELS[n]}
                  </option>
                ))}
              </select>
              <label className="cursor-pointer rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20" title="Subir una imagen como icono">
                ⬆
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
              {custom && (
                <button className="rounded px-1 opacity-70 hover:opacity-100" title="Volver al aspecto de serie" onClick={() => setLook(type, null)}>
                  ↺
                </button>
              )}
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
