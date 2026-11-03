"use client";

import { useRef } from "react";
import StatsPanel from "./StatsPanel";

const btn = "rounded-md px-2 py-1 text-sm font-medium";

/** «📊 Estadísticas» del editor: cuántos grupos juegan de verdad. Solo para el creador. */
export default function StatsDialog({ adminKey, onClose }: { adminKey: () => string; onClose: () => void }) {
  // el fondo solo cierra si el clic empezó Y terminó en él (como «📝 Tarjetas»)
  const downOnBackdrop = useRef(false);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"
      onMouseDown={(e) => (downOnBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => {
        const fromBackdrop = downOnBackdrop.current && e.target === e.currentTarget;
        downOnBackdrop.current = false;
        if (fromBackdrop) onClose();
      }}
    >
      <div className="flex max-h-full w-full max-w-4xl flex-col gap-3 overflow-auto rounded-2xl bg-[#1c1f27] p-5 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl text-amber-400">📊 Estadísticas de uso</h2>
          <button className={`${btn} ml-auto bg-white/10 hover:bg-white/20`} onClick={onClose}>
            Cerrar
          </button>
        </div>
        <StatsPanel adminKey={adminKey} />
      </div>
    </div>
  );
}
