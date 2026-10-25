"use client";

import { useEffect, useState } from "react";
import { isMuted, needsUnlock, setMuted, unlock } from "@/lib/sfx";

/** Botón de sonido. Si el navegador aún no deja sonar, pide un toque para activarlo. */
export default function SoundToggle() {
  const [muted, setMutedState] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setMutedState(isMuted());
    const check = () => setLocked(needsUnlock());
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []);

  if (locked && !muted) {
    return (
      <button onClick={() => unlock()?.then(() => setLocked(false))} className="btn-game animate-pulse bg-btn-yellow px-3 py-1.5 text-sm text-white">
        🔊 ACTIVAR SONIDO
      </button>
    );
  }
  return (
    <button
      onClick={() => {
        setMuted(!muted);
        setMutedState(!muted);
        unlock();
      }}
      aria-label={muted ? "Activar sonido" : "Silenciar"}
      className="btn-game bg-btn-blue px-3 py-1.5 text-sm text-white"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
