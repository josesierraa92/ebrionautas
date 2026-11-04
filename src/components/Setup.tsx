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
  /** Si lo lleva, bajo la tarjeta del paso 1 sale un botón «Volver» a esa dirección. */
  backHref?: string;
};

/** Alta de participantes: nombre y hombre/mujer (se usa en las casillas Machos y Hembras). */
export default function Setup({ onStart, busy = false, code, copas = true, backHref }: Props) {
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
  const [vp, setVp] = useState({ w: 390, h: 800 });
  useEffect(() => {
    const fit = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      setZoom(window.innerWidth < 700 ? 1 : Math.max(1, Math.min(1.6, Math.min(window.innerHeight / 780, window.innerWidth / 560))));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  // en pantallas anchas, a partir de 3 jugadores la lista va en columnas (la tarjeta se ensancha) para no alargarla sin fin:
  // 2 columnas y, si aun así no cabe en la altura de la pantalla, 3 (siempre que quepan a lo ancho)
  const cols = (() => {
    if (!(zoom > 1 && step === 1 && players.length >= 3)) return 1;
    const fits = (c: number) => (458 + Math.ceil(players.length / c) * 118) * zoom <= vp.h;
    const roomFor3 = (66 * 17 * zoom + 64) <= vp.w;
    return fits(2) || !roomFor3 ? 2 : 3;
  })();
  const twoCols = cols > 1;
  const u = (k: number) => `calc(var(--u) * ${k})`;
  const rowBg = "rgba(255,255,255,.08)";
  return (
    <main className={`mx-auto flex ${cols === 3 ? "max-w-[90rem]" : twoCols ? "max-w-[60rem]" : "max-w-md"} flex-col items-center justify-center gap-3 px-4 pt-14 pb-2`} style={{ zoom, minHeight: `calc((100dvh - 4.5rem) / ${zoom})` }}>
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
        width={cols === 3 ? 66 : twoCols ? 46 : 24}
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
        <ol className={cols === 3 ? "grid grid-cols-3" : twoCols ? "grid grid-cols-2" : "flex flex-col"} style={{ marginTop: u(0.8), gap: u(0.6) }}>
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
          <button onClick={() => setPlayers([...players, { name: "", gender: null }])} className="btn-game w-full bg-btn-blue py-4 text-2xl text-white" style={{ marginTop: u(0.8) }}>
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
                <span className="flex justify-center" style={{ gap: 2, minHeight: 34 }}>{Array.from({ length: n }, (_, i) => <TrophyIcon key={i} size={n === 1 ? 40 : n === 2 ? 30 : 24} stroke={140} />)}</span>
                <span style={{ fontSize: u(1.9), lineHeight: 1 }}>{n}</span>
                <span className="whitespace-nowrap uppercase" style={{ fontSize: u(0.8), lineHeight: 1, letterSpacing: "0.04em", opacity: 0.9 }}>{n === 1 ? "Corta" : n === 2 ? "Larga" : "Muy larga"}</span>
              </button>
            ))}
          </div>
          <div className="text-center"><CardText size={1.05}>{cups === 1 ? <><b style={{ color: "#bffa58" }}>Partida corta:</b> el primero que llegue a la meta gana.</> : <><b style={{ color: "#bffa58" }}>Partida {cups === 2 ? "larga" : "muy larga"}:</b> gana quien llegue a la meta {cups} veces. Cada vez que alguien llega, la carrera empieza de nuevo.</>}</CardText></div>
        </CardPanel>
      )}
      {step === 1 && backHref && <BackButton href={backHref} size="0.95rem" />}
    </main>
  );
}
