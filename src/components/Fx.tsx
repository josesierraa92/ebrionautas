"use client";

import { useEffect, useState } from "react";
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
      <Die key={`${dice.key}-${dice.rolling}`} value={dice.rolling ? face : dice.value} className={`w-[26%] ${dice.rolling ? "dice-tumble" : "dice-land"}`} />
    </div>
  );
}

/** Título grande que aparece al caer en una casilla especial. */
export function BannerOverlay({ banner }: { banner: Banner | null }) {
  if (!banner) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center bg-[radial-gradient(circle,rgba(255,255,255,.75)_0%,rgba(255,255,255,.35)_45%,transparent_72%)]">
      <div key={banner.key} className="banner-pop flex flex-col items-center gap-[2%] px-[4%] text-center">
        <span className="leading-none" style={{ fontSize: "16cqw" }}>
          {banner.emoji}
        </span>
        <span
          className="banner-text font-display leading-none"
          style={{ fontSize: "8.5cqw", color: banner.color }}
        >
          {banner.title}
        </span>
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
