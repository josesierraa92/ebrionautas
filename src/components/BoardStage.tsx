"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState } from "react";
import Board from "@/components/Board";
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
  /** Forzar el tablero 2D (p. ej. TV lenta). Si el dispositivo no tiene WebGL se usa siempre el 2D. */
  prefer2d?: boolean;
  /** Capas extra encima del tablero (tarjeta grande, indicador de turno…). */
  children?: React.ReactNode;
};

/** ¿Este navegador puede dibujar 3D? Muchas TV y navegadores viejos no tienen WebGL. */
export function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Tablero (3D si se puede, 2D si no) con el dado y los títulos de evento encima. */
export default function BoardStage({ players, current, winner, fx, className, prefer2d = false, children }: Props) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [failed3d, setFailed3d] = useState(false);
  useEffect(() => setWebgl(supportsWebGL()), []);
  const use3d = webgl === true && !failed3d && !prefer2d;

  return (
    <div className={`@container relative w-full overflow-hidden rounded-3xl border-4 border-ink shadow-[0_8px_0_#1b1f4b] ${use3d ? "bg-[#f3e3f7]" : "board-space"} ${className ?? ""}`}>
      {webgl === null ? null : use3d ? (
        <Fallback onError={() => setFailed3d(true)}>
          <Board3D players={players} current={current} winner={winner} shown={fx.shown} flying={fx.flying} />
        </Fallback>
      ) : (
        <div className="flex h-full items-center justify-center p-[1%]">
          <div className="aspect-square h-full max-w-full">
            <Board players={players} current={current} winner={winner} shown={fx.shown} flying={fx.flying} />
          </div>
        </div>
      )}
      <DiceOverlay dice={fx.dice} />
      <BannerOverlay banner={fx.banner} />
      {children}
    </div>
  );
}

/** Si el 3D falla al arrancar (sin memoria de vídeo, driver raro…), se pasa al 2D en vez de romper la página. */
class Fallback extends Component<{ onError: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
