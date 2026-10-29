"use client";

import { useEffect, useRef } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const EVERY_MS = 45_000;

/**
 * La TV se queda horas con la página abierta y seguía con la versión vieja del juego (colores y diseño de antes). Cada 45 s pregunta
 * qué versión hay publicada y, si cambió, recarga la página en un momento tranquilo (`idle`: sin dado ni jugada en marcha).
 * En desarrollo (`dev`) no hace nada.
 */
export function useAutoUpdate(idle: boolean) {
  const stale = useRef(false);
  const idleRef = useRef(idle);
  idleRef.current = idle;

  useEffect(() => {
    if (BUILD_ID === "dev") return;
    const check = async () => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { id } = (await r.json()) as { id: string };
        if (id && id !== "dev" && id !== BUILD_ID) stale.current = true;
      } catch {
        /* sin conexión: se vuelve a intentar */
      }
      if (stale.current && idleRef.current) location.reload();
    };
    const t = setInterval(check, EVERY_MS);
    // también cuando la TV queda en un momento tranquilo con una versión nueva ya detectada
    const t2 = setInterval(() => stale.current && idleRef.current && location.reload(), 5000);
    return () => {
      clearInterval(t);
      clearInterval(t2);
    };
  }, []);
}
