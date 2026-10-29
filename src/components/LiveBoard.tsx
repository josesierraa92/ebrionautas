"use client";

// Tablero de la TV en 3D en vivo: el diseño publicado dibujado por la tarjeta gráfica a la resolución de la pantalla
// (nítido como en el editor y sin descargar imágenes enormes), con los jugadores como zombis 3D animados.
// El motor (three.js) se carga aparte. Si el aparato no tiene 3D o va lento, avisa con `onFail` y la TV usa la imagen.
import { useEffect, useRef, useState } from "react";
import type { BoardLayout } from "@/editor/layout";
import { EDITOR_FONT_CLASSES } from "@/editor/fonts";
import type { LiveBoard as Live, LiveState } from "@/live/liveBoard";

type Props = LiveState & { layout: BoardLayout; onReady: () => void; onFail: (why: string) => void; onSmooth?: () => void };

/** Ruta del .glb de cada modelo: el catálogo de serie más los modelos propios subidos. */
async function modelIndex(): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  const [catalog, custom] = await Promise.all([
    fetch("/models/catalog.json").then((r) => r.json()).catch(() => ({ models: [] })),
    fetch("/api/models", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ models: [] })),
  ]);
  for (const m of catalog.models as { id: string; file: string }[]) index.set(m.id, m.file);
  for (const m of custom.models as { id: string; url: string }[]) index.set(m.id, m.url);
  return index;
}

/** ¿Hay WebGL? (sin él, ni se intenta). */
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function LiveBoard({ layout, onReady, onFail, onSmooth, ...state }: Props) {
  const viewRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<Live | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let alive = true;
    let watch = 0;
    if (!hasWebGL()) {
      onFail("sin WebGL");
      return;
    }
    (async () => {
      try {
        const [{ LiveBoard: LiveClass }, index] = await Promise.all([import("@/live/liveBoard"), modelIndex()]);
        if (!alive || !viewRef.current || !labelsRef.current) return;
        const live = new LiveClass(viewRef.current, labelsRef.current, layout, (id) => index.get(id));
        liveRef.current = live;
        live.update(stateRef.current);
        await live.start();
        if (!alive) return;
        setShown(true);
        onReady();
        // Si el aparato va a menos de ~18 fotogramas por segundo de forma sostenida, mejor la imagen (se nota menos que
        // un 3D a saltos). Se mide DESPUÉS de unos segundos de calentamiento (al principio se compilan los shaders y
        // va lento aunque luego vaya fluido) y en dos ventanas seguidas; con la pestaña oculta no se mide (el
        // navegador para los fotogramas y parecería lento). Solo al empezar (6 ventanas, ~30 s): antes se medía toda la
        // partida y una racha lenta cualquiera (p. ej. justo tras un F5) dejaba la TV en imagen, con los personajes quietos.
        if (new URLSearchParams(location.search).has("3d")) return; // forzado (pruebas): sin comprobar la velocidad
        const WINDOW = 4000;
        let slow = 0;
        let windows = 0;
        const measure = () => {
          if (++windows > 6) return onSmooth?.();
          const f0 = live.frames;
          const t0 = performance.now();
          watch = window.setTimeout(() => {
            if (!alive) return;
            if (document.hidden) return measure();
            const fps = ((live.frames - f0) / (performance.now() - t0)) * 1000;
            slow = fps < 18 ? slow + 1 : 0;
            if (slow >= 2) return onFail("lento");
            measure();
          }, WINDOW);
        };
        watch = window.setTimeout(measure, 6000); // calentamiento: shaders y la resolución dinámica se asientan
      } catch (e) {
        if (alive) onFail(e instanceof Error ? e.message : "error");
      }
    })();
    return () => {
      alive = false;
      clearTimeout(watch);
      liveRef.current?.dispose();
      liveRef.current = null;
    };
    // se monta una vez por diseño publicado
  }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    liveRef.current?.update(state);
  });

  return (
    <div className={`absolute inset-0 transition-opacity duration-700 ${shown ? "opacity-100" : "opacity-0"} ${EDITOR_FONT_CLASSES}`}>
      <div ref={viewRef} className="absolute inset-0" />
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}
