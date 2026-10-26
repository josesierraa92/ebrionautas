"use client";

import { BannerOverlay, DiceOverlay } from "@/components/Fx";
import IsoBoard from "@/components/IsoBoard";
import type { Player } from "@/game/engine";
import type { useGameFx } from "@/lib/useGameFx";

type Props = {
  players: Player[];
  current: string;
  winner?: string | null;
  fx: ReturnType<typeof useGameFx>;
  className?: string;
  /** Sin marco ni bordes redondeados: modo tablero a pantalla completa. */
  bare?: boolean;
  /** Hay una tarjeta a la derecha: el tablero se aparta a la izquierda para que no la tape. */
  side?: boolean;
  /** Capas extra encima del tablero (tarjeta grande, indicador de turno…). */
  children?: React.ReactNode;
};

/** Tablero isométrico con el dado y los títulos de evento encima. */
export default function BoardStage({ players, current, winner, fx, className, bare = false, side = false, children }: Props) {
  return (
    <div className={`board-space @container relative w-full overflow-hidden ${bare ? "" : "rounded-3xl border-4 border-ink shadow-[0_8px_0_#1b1f4b]"} ${className ?? ""}`}>
      <div className="h-full w-full transition-transform duration-500 ease-out" style={side ? { transform: "translateX(-15%) scale(0.82)" } : undefined}>
        <IsoBoard players={players} current={current} winner={winner} shown={fx.shown} flying={fx.flying} />
      </div>
      <DiceOverlay dice={fx.dice} />
      <BannerOverlay banner={fx.banner} />
      {children}
    </div>
  );
}
