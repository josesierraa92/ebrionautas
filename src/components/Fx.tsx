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
export function BannerOverlay({ banner }: { banner: Banner | null }) {
  if (!banner) return null;
  const mask = banner.icon ? iconMaskUrl(banner.icon, 512) : null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center overflow-hidden bg-black/35">
      <div key={banner.key} className="banner-slam w-full">
        <div
          className="relative flex items-center justify-center gap-[3cqw] py-[2.4cqw]"
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
            <div className="shrink-0" style={{ width: "11cqw", filter: `drop-shadow(0.25cqw 0 0 ${INK}) drop-shadow(-0.25cqw 0 0 ${INK}) drop-shadow(0 0.25cqw 0 ${INK}) drop-shadow(0 -0.25cqw 0 ${INK})` }}>
              <div className="aspect-square w-full" style={{ background: banner.color, WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
            </div>
          ) : (
            <span className="leading-none" style={{ fontSize: "9cqw" }}>
              {banner.emoji === "🏆" ? <TrophyIcon size="1em" /> : banner.emoji}
            </span>
          )}
          <div className="flex min-w-0 flex-col items-start">
            {banner.n !== undefined && (
              <span className="font-sans font-bold tracking-[0.5em] uppercase" style={{ fontSize: "1.5cqw", color: banner.color, opacity: 0.9 }}>
                Casilla {banner.n}
              </span>
            )}
            <span className="banner-title leading-none whitespace-nowrap" style={{ fontSize: `${Math.min(8.6, 125 / banner.title.length)}cqw`, ["--accent" as string]: banner.color }}>
              {banner.title}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["#5cd23c", "#2f7bf5", "#e53fd6", "#ffc61a", "#e8344a", "#00d1c1", "#ff8a1f", "#fff"];

/** Lluvia de confeti para el ganador. Posiciones deterministas: nada de Math.random al renderizar. */
export function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {Array.from({ length: 70 }, (_, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${(i % 14) * 0.18}s`,
            animationDuration: `${2.6 + (i % 5) * 0.45}s`,
            width: i % 3 ? 10 : 14,
            height: i % 2 ? 16 : 10,
          }}
        />
      ))}
    </div>
  );
}
