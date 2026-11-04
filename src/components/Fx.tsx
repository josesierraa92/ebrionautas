"use client";

import { useEffect, useState } from "react";
import TrophyIcon from "@/components/TrophyIcon";
import { iconMaskUrl } from "@/editor/icons";
import type { Banner, DiceFx } from "@/lib/useGameFx";

const INK = "#1b1f4b";
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

export function Die({ value, className }: { value: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`Dado: ${value}`}>
      <rect x="5" y="9" width="90" height="88" rx="20" fill={INK} />
      <rect x="5" y="3" width="90" height="88" rx="20" fill="#fff" stroke={INK} strokeWidth="5" />
      <rect x="14" y="9" width="72" height="14" rx="7" fill="#e9ecf5" />
      {PIPS[value]?.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy - 3} r="9" fill={value === 1 ? "#e8344a" : INK} />
      ))}
    </svg>
  );
}

/** Dado gigante rodando en el centro del tablero. */
export function DiceOverlay({ dice }: { dice: DiceFx | null }) {
  const [face, setFace] = useState(1);
  useEffect(() => {
    if (!dice?.rolling) return;
    const id = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 75);
    return () => clearInterval(id);
  }, [dice?.rolling, dice?.key]);
  if (!dice) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-space/30">
      <div className="flex w-[26%] flex-col items-center gap-[1.5cqw]">
        <Die key={`${dice.key}-${dice.rolling}`} value={dice.rolling ? face : dice.value} className={`w-full ${dice.rolling ? "dice-tumble" : "dice-land"}`} />
        {dice.by && <span className="banner-title text-[4cqw] leading-none whitespace-nowrap uppercase" style={{ ["--accent" as string]: "#ffc61a" }}>{dice.by}</span>}
      </div>
    </div>
  );
}

/**
 * Título grande al caer en una casilla especial: una franja oscura que cruza la pantalla, ladeada, con el icono de la
 * casilla (vector, nítido, del color del evento con contorno), «CASILLA N» y el título en letra de terror. Sin
 * resplandor ni discos: solo se atenúa un poco el tablero para que se lea.
 */
/** Parte un título en dos renglones lo más parejos posible, sin cortar palabras. */
function splitTitle(title: string): string[] {
  const words = title.split(" ");
  if (words.length < 2) return [title];
  let best = [title];
  let diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const d = Math.abs(a.length - b.length);
    if (d < diff) {
      diff = d;
      best = [a, b];
    }
  }
  return best;
}

export function BannerOverlay({ banner }: { banner: Banner | null }) {
  if (!banner) return null;
  const mask = banner.icon ? iconMaskUrl(banner.icon, 512) : null;
  // celular vertical: un título largo va en dos renglones parejos, cada uno en su línea, así el bloque mide lo que mide su renglón más largo y el icono queda pegado al título
  const portrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth;
  const lines = portrait && banner.title.length > 14 ? splitTitle(banner.title) : [banner.title];
  const longest = Math.max(...lines.map((l) => l.length));
  const titleSize = lines.length > 1 ? `max(${Math.min(8.6, 70 / (0.66 * longest))}cqw, 22px)` : `max(${Math.min(8.6, 125 / banner.title.length)}cqw, 28px)`;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center overflow-hidden bg-black/35">
      <div key={banner.key} className="banner-slam w-full">
        <div
          className="relative flex items-center justify-center gap-[3cqw] px-3 py-[max(2.4cqw,14px)]"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(10,7,26,.94) 12%, rgba(10,7,26,.94) 88%, transparent 100%)" }}
        >
          {/* filetes de color arriba y abajo, que se apagan hacia los lados */}
          {[0, 1].map((i) => (
            <span
              key={i}
              className="absolute right-[6%] left-[6%] h-[0.3cqw]"
              style={{ [i ? "bottom" : "top"]: 0, background: `linear-gradient(90deg, transparent, ${banner.color} 25%, ${banner.color} 75%, transparent)` }}
            />
          ))}
          {mask ? (
            // el contorno oscuro va en el contenedor (un filtro dentro de una máscara se recortaría)
            <div className="shrink-0" style={{ width: "max(11cqw, 64px)", filter: `drop-shadow(0.25cqw 0 0 ${INK}) drop-shadow(-0.25cqw 0 0 ${INK}) drop-shadow(0 0.25cqw 0 ${INK}) drop-shadow(0 -0.25cqw 0 ${INK})` }}>
              <div className="aspect-square w-full" style={{ background: banner.color, WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
            </div>
          ) : (
            <span className="leading-none" style={{ fontSize: "max(9cqw, 56px)" }}>
              {banner.emoji === "🏆" ? <TrophyIcon size="1em" /> : banner.emoji}
            </span>
          )}
          <div className="flex min-w-0 flex-col items-center text-center">
            {banner.n !== undefined && (
              <span className="font-sans font-bold tracking-[0.5em] uppercase" style={{ fontSize: "max(1.5cqw, 14px)", color: banner.color, opacity: 0.9 }}>
                Casilla {banner.n}
              </span>
            )}
            {lines.map((line) => (
              <span key={line} className="banner-title leading-[1.05] whitespace-nowrap" style={{ fontSize: titleSize, ["--accent" as string]: banner.color }}>
                {line}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// el «confeti» del ganador es oscuro: murciélagos casi negros que bajan aleteando con un resplandor morado y brasas moradas que suben flotando
const BAT_COLORS = ["#0a0714", "#1a0b38", "#2a0f5c", "#0a0714"];
const EMBER_COLORS = ["#b98bf0", "#8a5af0", "#e53fd6", "#d2b4ff"];

/** Lluvia de murciélagos y brasas para el ganador. Posiciones deterministas: nada de Math.random al renderizar. */
export function Confetti() {
  const mask = iconMaskUrl("bat", 96);
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {Array.from({ length: 26 }, (_, i) => {
        const size = 30 + (i % 4) * 8;
        return (
          <span
            key={`b${i}`}
            className="confetti confetti-bat"
            style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 13) * 0.35}s`, animationDuration: `${4 + (i % 5) * 0.7}s`, width: size, height: size }}
          >
            <span
              className="block h-full w-full"
              style={{ background: BAT_COLORS[i % BAT_COLORS.length], WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }}
            />
          </span>
        );
      })}
      {Array.from({ length: 34 }, (_, i) => {
        const size = 4 + (i % 3) * 3;
        const color = EMBER_COLORS[i % EMBER_COLORS.length];
        return (
          <span
            key={`e${i}`}
            className="ember"
            style={{ left: `${(i * 29 + 7) % 100}%`, width: size, height: size, background: color, boxShadow: `0 0 ${size * 2}px ${color}`, animationDelay: `${(i % 11) * 0.45}s`, animationDuration: `${3.5 + (i % 6) * 0.6}s` }}
          />
        );
      })}
    </div>
  );
}
