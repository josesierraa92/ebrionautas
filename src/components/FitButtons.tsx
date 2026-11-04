"use client";

// Los botones del juego (`.btn-game`) nunca se parten en dos renglones: si el texto no cabe en el ancho que tiene el botón, la letra baja
// (hasta la mitad) hasta que cabe en una línea con un margen de 14 px a cada lado. Solo los botones de puro texto (los que llevan elementos dentro, como el nombre y los vasos de
// «+ TRAGO», se arreglan a mano). Se revisa cuando cambia la pantalla, el texto o aparece un botón nuevo.
import { useEffect } from "react";

const MIN = 0.5;

function fit(el: HTMLElement) {
  if (el.children.length) return;
  el.style.whiteSpace = "nowrap";
  // el tamaño que ya traía el botón (por clase de Tailwind, o inline en las tarjetas de la TV)
  if (el.dataset.fitInline === undefined) el.dataset.fitInline = el.style.fontSize;
  el.style.fontSize = el.dataset.fitInline;
  // ancho del texto contra el ancho del botón menos un margen a cada lado (el mayor entre su relleno y 14 px), para que la letra nunca roce el borde
  const cs = getComputedStyle(el);
  const margin = Math.max(parseFloat(cs.paddingLeft) || 0, 14);
  const range = document.createRange();
  range.selectNodeContents(el);
  // un botón que se ajusta solo a su texto (ancho automático) no necesita achicar la letra: ya mide lo que su texto pide
  const natural = range.getBoundingClientRect().width + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
  if (el.offsetWidth <= natural + 2) return;
  const tooWide = () => range.getBoundingClientRect().width > el.clientWidth - 2 * margin;
  if (!tooWide()) return;
  let size = parseFloat(cs.fontSize);
  if (!Number.isFinite(size)) return;
  const min = size * MIN;
  while (tooWide() && size > min) {
    size -= 0.5;
    el.style.fontSize = `${size}px`;
  }
}

export default function FitButtons() {
  useEffect(() => {
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => document.querySelectorAll<HTMLElement>(".btn-game").forEach(fit));
    };
    const mo = new MutationObserver(run);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", run);
    document.fonts?.ready.then(run).catch(() => {});
    run();
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener("resize", run);
    };
  }, []);
  return null;
}
