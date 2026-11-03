"use client";

import StatsPanel from "@/editor/StatsPanel";

// Mismas estadísticas que el botón «📊 Estadísticas» del editor, en una página aparte (solo para el creador).
export default function StatsPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 bg-[#0a0620] px-5 py-8 text-white/90">
      <h1 className="font-display text-3xl text-btn-yellow">Estadísticas de uso</h1>
      <StatsPanel />
    </main>
  );
}
