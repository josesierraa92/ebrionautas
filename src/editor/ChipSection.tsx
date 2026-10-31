"use client";

// Sección del editor para ajustar la tarjeta de usuario de la TV (el cuadro del turno): copita (tamaño, posición, color, borde), tamaño del
// zombi, tipo de letra, tamaño y colores del texto. La vista previa usa el mismo `TurnChip` que la TV.
import { useMemo, useState } from "react";
import { TurnChip } from "@/components/TvCards";
import TrophyIcon, { TROPHIES, TROPHY_IDS, type TrophyId } from "@/components/TrophyIcon";
import { createGame } from "@/game/engine";
import { CHIP_LIMITS, DEFAULT_CHIP, NUMBER_FONTS, type ChipStyle, type NumberFont } from "./layout";

type Props = {
  chip: ChipStyle;
  /** Cambio en marcha (arrastrando un control): no entra todavía en el historial. */
  onLive: (c: ChipStyle) => void;
  /** Soltó el control: se guarda el paso en el historial (deshacer). */
  onStart: () => void;
  onEnd: () => void;
};

export default function ChipSection({ chip, onLive, onStart, onEnd }: Props) {
  // solo para la vista previa: 1 o 2 rondas ganadas (estrellas) o la partida ganada (la copa, con las estrellas de las rondas anteriores)
  const [preview, setPreview] = useState<"1" | "2" | "copa">("2");
  const game = useMemo(() => {
    const g = createGame([{ name: "Vane", color: "#3ba0ff", gender: "mujer" }, { name: "Jose", color: "#ff3fd0", gender: "hombre" }], 3);
    g.players[0].cups = preview === "copa" ? 3 : Number(preview);
    if (preview === "copa") g.winner = g.players[0].id;
    return g;
  }, [preview]);
  const set = (patch: Partial<ChipStyle>) => onLive({ ...chip, ...patch });

  const slider = (label: string, key: "glow" | "reach" | "gap" | "cupSize" | "cupX" | "cupY" | "outline" | "zombie" | "nameSize", suffix: string, step = 1) => (
    <label className="grid gap-0.5 text-sm">
      <span className="flex justify-between">
        {label} <b>{chip[key]}{suffix}</b>
      </span>
      <input
        type="range"
        min={CHIP_LIMITS[key].min}
        max={CHIP_LIMITS[key].max}
        step={step}
        value={chip[key]}
        onPointerDown={onStart}
        onChange={(e) => set({ [key]: Number(e.target.value) })}
        onPointerUp={onEnd}
      />
    </label>
  );
  const picker = (label: string, key: "icon" | "winIcon") => (
    <div className="grid gap-1">
      <p className="text-[11px] font-bold opacity-80">{label}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {TROPHY_IDS.map((id: TrophyId) => (
          <button
            key={id}
            title={TROPHIES[id].label}
            aria-label={`${label}: ${TROPHIES[id].label}`}
            aria-pressed={chip[key] === id}
            onClick={() => { onStart(); set({ [key]: id }); onEnd(); }}
            className={`grid place-items-center rounded-lg p-1.5 ${chip[key] === id ? "bg-amber-400/30 ring-2 ring-amber-400" : "bg-white/10 hover:bg-white/20"}`}
          >
            <TrophyIcon size={34} icon={id} fill={chip.cupColor} outline={chip.outlineColor} stroke={Math.min(chip.outline, 48)} />
          </button>
        ))}
      </div>
    </div>
  );
  const color = (label: string, key: "cupColor" | "outlineColor" | "glowColor" | "nameColor" | "labelColor") => (
    <label className="flex items-center justify-between gap-2 text-sm">
      {label}
      <input type="color" value={chip[key]} onChange={(e) => set({ [key]: e.target.value })} onPointerDown={onStart} onBlur={onEnd} className="h-7 w-12 cursor-pointer rounded border-0 bg-transparent" />
    </label>
  );

  return (
    <section className="grid gap-2 rounded-xl bg-white/5 p-2.5">
      <h3 className="font-display text-sm text-amber-400">🪪 Tarjeta de usuario (TV)</h3>
      <div className="grid min-h-[120px] place-items-center overflow-hidden rounded-lg bg-[#0d0a1f] p-4">
        <TurnChip game={game} chip={chip} inline />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        Vista previa
        <div className="flex gap-1" role="group" aria-label="Qué premios enseña la vista previa">
          {([["1", "1 ronda"], ["2", "2 rondas"], ["copa", "Ganó el juego"]] as const).map(([k, label]) => (
            <button key={k} aria-pressed={preview === k} onClick={() => setPreview(k)} className={`rounded-md px-2.5 py-0.5 font-display ${preview === k ? "bg-amber-400 text-black" : "bg-white/10 hover:bg-white/20"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {picker("Estrella: cada ronda ganada", "icon")}
      {picker("Copa: ganó la partida entera", "winIcon")}
      <p className="text-[11px] font-bold opacity-80">Premios</p>
      {slider("Tamaño", "cupSize", " %", 5)}
      {slider("Espacio entre copitas", "gap", " %", 5)}
      {slider("Posición horizontal", "cupX", " %", 5)}
      {slider("Posición vertical", "cupY", " %", 5)}
      {slider("Grosor del contorno", "outline", "", 4)}
      {color("Color de la copa", "cupColor")}
      {color("Color del contorno", "outlineColor")}
      <p className="mt-1 text-[11px] font-bold opacity-80">Resplandor (luz)</p>
      {slider("Fuerza de la luz", "glow", " %", 5)}
      {slider("Alcance de la luz", "reach", " %", 5)}
      {color("Color de la luz", "glowColor")}
      <p className="mt-1 text-[11px] font-bold opacity-80">Zombi y texto</p>
      {slider("Tamaño del zombi", "zombie", " %", 5)}
      <label className="grid gap-0.5 text-sm">
        Tipo de letra
        <select value={chip.font} onChange={(e) => set({ font: e.target.value as NumberFont })} className="rounded bg-white/10 px-2 py-1 text-sm">
          {(Object.keys(NUMBER_FONTS) as NumberFont[]).map((f) => (
            <option key={f} value={f} className="bg-[#1c1f27]">
              {NUMBER_FONTS[f].label}
            </option>
          ))}
        </select>
      </label>
      {slider("Tamaño del nombre", "nameSize", " %", 5)}
      {color("Color del nombre", "nameColor")}
      {color("Color de «Turno de»", "labelColor")}
      <p className="text-[11px] opacity-60">Se guarda con el diseño y se ve en la TV al «Publicar». La vista previa solo cambia lo que ves aquí (no se guarda).</p>
      <button className="rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20" onClick={() => { onStart(); onLive(DEFAULT_CHIP); onEnd(); }}>
        Volver a los valores de serie
      </button>
    </section>
  );
}
