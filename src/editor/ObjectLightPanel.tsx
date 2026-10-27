"use client";

// Luz de un objeto del tablero (faroles, velas, hogueras…): encendida, color, fuerza y alcance.
import { DEFAULT_LIGHT, LIGHT_LIMITS, lightOf, type ObjectLight, type PlacedObject } from "./layout";

export default function ObjectLightPanel({
  obj,
  name,
  onSet,
  onLive,
  onLiveEnd,
  onApplyAll,
}: {
  obj: PlacedObject;
  name: string;
  /** Cambio puntual (un clic): un paso de deshacer. */
  onSet: (light: ObjectLight) => void;
  /** Cambio continuo (arrastrar un control deslizante): se apunta un solo paso al terminar (onLiveEnd). */
  onLive: (light: ObjectLight) => void;
  onLiveEnd: () => void;
  onApplyAll: (light: ObjectLight) => void;
}) {
  const current = lightOf(obj);
  const light = current ?? DEFAULT_LIGHT;
  const on = !!current?.on;
  const slider = "w-full";
  return (
    <div className="grid gap-1.5 rounded-lg bg-white/5 p-2 text-xs">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={on} onChange={(e) => onSet({ ...light, on: e.target.checked })} />
        💡 Emite luz
      </label>
      {on && (
        <>
          <label className="flex items-center justify-between gap-2">
            Color
            <input type="color" value={light.color} onChange={(e) => onSet({ ...light, color: e.target.value })} className="h-6 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
          </label>
          <label className="grid gap-0.5">
            <span className="flex justify-between">
              Fuerza <b>{Math.round(light.intensity)}</b>
            </span>
            <input
              type="range"
              className={slider}
              min={LIGHT_LIMITS.intensity.min}
              max={LIGHT_LIMITS.intensity.max}
              value={light.intensity}
              onChange={(e) => onLive({ ...light, intensity: Number(e.target.value) })}
              onPointerUp={onLiveEnd}
              onKeyUp={onLiveEnd}
            />
          </label>
          <label className="grid gap-0.5">
            <span className="flex justify-between">
              Alcance <b>{Math.round(light.distance)}</b>
            </span>
            <input
              type="range"
              className={slider}
              min={LIGHT_LIMITS.distance.min}
              max={LIGHT_LIMITS.distance.max}
              value={light.distance}
              onChange={(e) => onLive({ ...light, distance: Number(e.target.value) })}
              onPointerUp={onLiveEnd}
              onKeyUp={onLiveEnd}
            />
          </label>
          <button className="rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => onApplyAll(light)} title="Copia esta luz a todos los objetos iguales">
            Aplicar a todos los «{name}»
          </button>
        </>
      )}
    </div>
  );
}
