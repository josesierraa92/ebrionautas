"use client";

import BackButton from "@/components/BackButton";
import { characterOf } from "@/game/characters";
import { useEffect, useState } from "react";
import CardPanel, { CardText } from "@/components/CardPanel";
import Logo from "@/components/Logo";
import Marciano from "@/components/Marciano";
import TrophyIcon from "@/components/TrophyIcon";
import { defaultAvatar } from "@/game/avatar";
import type { Gender } from "@/game/engine";
import { PLAYER_COLORS } from "@/game/tileStyle";

type Draft = { name: string; gender: Gender | null; look?: number };
type Props = {
  onStart: (players: { name: string; gender: Gender; look?: number }[], cups: number) => void;
  busy?: boolean;
  /** Código de la mesa: sale arriba a la derecha, frente al logo. */
  code?: string;
  /** Enseñar la elección de copas (el modo local `/jugar` no tiene rondas). */
  copas?: boolean;
};

/** Alta de participantes: nombre y hombre/mujer (se usa en las casillas Machos y Hembras). */
export default function Setup({ onStart, busy = false, code, copas = true }: Props) {
  const [players, setPlayers] = useState<Draft[]>([
    { name: "", gender: null },
    { name: "", gender: null },
  ]);
  const [cups, setCups] = useState(1);
  // paso 1: los muertos; paso 2: las copas (solo si el modo las tiene) y ahí se pulsa «¡A LEVANTARSE!»
  const [step, setStep] = useState<1 | 2>(1);
  const start = () => onStart(filled.map((p) => ({ name: p.name.trim(), gender: p.gender!, look: p.look })), copas ? cups : 1);
  const set = (i: number, patch: Partial<Draft>) => setPlayers(players.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  /** Al elegir hombre o mujer (cada vez que se toca) sale un personaje al azar de ese género, evitando los que ya usan otros. */
  const pickGender = (i: number, g: Gender) => {
    const taken = new Set(players.filter((q, j) => j !== i && q.gender === g && q.look != null).map((q) => q.look));
    const all = [0, 1, 2, 3, 4, 5];
    const free = all.filter((n) => !taken.has(n));
    const pool = free.length ? free : all;
    set(i, { gender: g, look: pool[Math.floor(Math.random() * pool.length)] });
  };

  const filled = players.filter((p) => p.name.trim());
  const names = filled.map((p) => p.name.trim().toLowerCase());
  const duplicated = new Set(names).size !== names.length;
  const missingGender = filled.some((p) => !p.gender);
  const ready = filled.length >= 2 && !duplicated && !missingGender;

  // en pantallas grandes (PC, TV) todo el formulario se agranda (`zoom`); en el celular se queda como está
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const fit = () => setZoom(window.innerWidth < 700 ? 1 : Math.max(1, Math.min(1.6, Math.min(window.innerHeight / 780, window.innerWidth / 560))));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const u = (k: number) => `calc(var(--u) * ${k})`;
  const rowBg = "rgba(255,255,255,.08)";
  return (
    <main className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-4 py-6" style={{ zoom, minHeight: `calc((100dvh - 4.5rem) / ${zoom})` }}>
      {/* logo grande arriba y centrado; el código de la mesa, en la esquina de arriba a la derecha de la pantalla */}
      <Logo className="w-[min(22rem,100%)] shrink-0" />
      {code && (
        <span className="fixed top-3 right-3 z-20 font-display uppercase" style={{ padding: "0.3rem 1.1rem", borderRadius: 999, background: "linear-gradient(160deg, #bffa58, #5fc34a)", color: "#14260a", fontSize: "1.3rem", letterSpacing: "0.08em", zoom: 1 / zoom }}>
          Mesa {code}
        </span>
      )}
      {step === 1 ? (
      <CardPanel
        inline
        unit="17px"
        width={24}
        maxH="none" /* formulario largo: la página se desplaza entera */
        title="¿Quién juega?"
        centerTitle
        actions={
          <>
            <button disabled={!ready || busy} onClick={() => (copas ? setStep(2) : start())} className="btn-game bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey">
              {copas ? "SIGUIENTE" : busy ? "LEVANTÁNDOSE…" : "¡A LEVANTARSE!"}
            </button>
            <p className="text-center text-sm" style={{ color: "#d8d4f6", opacity: 0.75, fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700 }}>
              {filled.length < 2
                ? "Hacen falta al menos 2 jugadores."
                : duplicated
                  ? "Hay nombres repetidos."
                  : missingGender
                    ? "Marca hombre o mujer para cada jugador."
                    : "Juego para mayores de 18 años. Bebe con moderación."}
            </p>
          </>
        }
      >
        <ol className="flex flex-col" style={{ marginTop: u(0.8), gap: u(0.6) }}>
          {players.map((p, i) => (
            <li key={i} className="flex items-center gap-2 p-2" style={{ background: rowBg, borderRadius: u(0.9) }}>
              <Marciano avatar={defaultAvatar(i, PLAYER_COLORS[i])} size={42} className="shrink-0" character={characterOf(players.map((q, j) => ({ id: String(j), gender: q.gender, look: q.look })), String(i))} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <input
                  value={p.name}
                  maxLength={16}
                  placeholder={`Muerto ${i + 1}`}
                  aria-label={`Nombre del jugador ${i + 1}`}
                  onChange={(e) => set(i, { name: e.target.value })}
                  className="min-w-0 rounded-xl bg-white px-3 py-1.5 text-lg text-ink outline-none"
                />
                <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={`Género del jugador ${i + 1}`}>
                  {(["hombre", "mujer"] as const).map((g) => (
                    <button
                      key={g}
                      aria-pressed={p.gender === g}
                      onClick={() => pickGender(i, g)}
                      className={`rounded-lg py-1 font-display text-sm ${p.gender === g ? (g === "hombre" ? "bg-btn-blue text-white" : "bg-btn-special text-white") : "bg-black/30 text-white/60"}`}
                    >
                      {g === "hombre" ? "♂ HOMBRE" : "♀ MUJER"}
                    </button>
                  ))}
                </div>
              </div>
              {players.length > 2 && (
                <button aria-label={`Quitar jugador ${i + 1}`} onClick={() => setPlayers(players.filter((_, j) => j !== i))} className="btn-game size-10 shrink-0 bg-btn-red text-white">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ol>

        {players.length < PLAYER_COLORS.length && (
          <button onClick={() => setPlayers([...players, { name: "", gender: null }])} className="btn-game w-full bg-btn-blue py-3 text-xl text-white" style={{ marginTop: u(0.8) }}>
            + AÑADIR MUERTO
          </button>
        )}

      </CardPanel>
      ) : (
        <CardPanel
          inline
          unit="17px"
          width={24}
          maxH="none"
          title="¿Cuántas copas?"
          centerTitle
          actions={
            <>
              <button disabled={busy} onClick={start} className="btn-game bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey">
                {busy ? "LEVANTÁNDOSE…" : "¡A LEVANTARSE!"}
              </button>
              <BackButton label="Atrás" onClick={() => setStep(1)} disabled={busy} size="0.95rem" className="self-center" />
            </>
          }
        >
          {/* minimalista: tres opciones grandes y una línea que explica la elegida */}
          <div role="group" aria-label="Copas para ganar" className="grid grid-cols-3" style={{ marginTop: u(0.8), gap: u(0.7) }}>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                aria-pressed={cups === n}
                onClick={() => setCups(n)}
                className={`flex flex-col items-center justify-center font-display ${cups === n ? "text-[#14260a]" : "bg-black/30 text-white/70"}`}
                style={{ gap: u(0.5), padding: `${u(1.3)} 0`, borderRadius: u(1), ...(cups === n ? { background: "linear-gradient(160deg, #bffa58, #5fc34a)" } : {}) }}
              >
                <span className="flex justify-center" style={{ gap: 2, minHeight: 34 }}>{Array.from({ length: n }, (_, i) => <TrophyIcon key={i} size={n === 1 ? 40 : n === 2 ? 30 : 24} stroke={70} />)}</span>
                <span style={{ fontSize: u(1.9), lineHeight: 1 }}>{n}</span>
              </button>
            ))}
          </div>
          <div className="text-center"><CardText size={1.05}>{cups === 1 ? "El primero que llegue a la meta gana." : `Gana quien consiga ${cups} copas: cada ronda se juega hasta la meta y se reinicia.`}</CardText></div>
        </CardPanel>
      )}
    </main>
  );
}
