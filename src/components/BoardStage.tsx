"use client";

import dynamic from "next/dynamic";
import { BannerOverlay, DiceOverlay } from "@/components/Fx";
import type { Player } from "@/game/engine";
import type { useGameFx } from "@/lib/useGameFx";

// Three.js solo existe en el navegador: el tablero 3D se carga sin render en servidor.
const Board3D = dynamic(() => import("@/components/Board3D"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center font-display text-ink/60">Cargando tablero…</div>,
});

type Props = {
  players: Player[];
  current: string;
  winner?: string | null;
  fx: ReturnType<typeof useGameFx>;
  className?: string;
  /** Capas extra encima del tablero (tarjeta grande, indicador de turno…). */
  children?: React.ReactNode;
};

/** Tablero 3D con el dado y los títulos de evento encima. */
export default function BoardStage({ players, current, winner, fx, className, children }: Props) {
  return (
    <div className={`@container relative w-full overflow-hidden rounded-3xl border-4 border-ink bg-[#f3e3f7] shadow-[0_8px_0_#1b1f4b] ${className ?? ""}`}>
      <Board3D players={players} current={current} winner={winner} shown={fx.shown} flying={fx.flying} />
      <DiceOverlay dice={fx.dice} />
      <BannerOverlay banner={fx.banner} />
      {children}
    </div>
  );
}
