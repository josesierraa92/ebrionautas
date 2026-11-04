"use client";

// Los botones del juego (`.btn-game`) nunca se parten en dos renglones: si el texto no cabe en el ancho que tiene el botón, la letra baja
// (hasta la mitad) hasta que cabe en una línea con un margen de 28 px a cada lado. Solo los botones de puro texto (los que llevan elementos dentro, como el nombre y los vasos de
// «+ TRAGO», se arreglan a mano). Se revisa cuando cambia la pantalla, el texto o aparece un botón nuevo.
import { useEffect } from "react";

const MIN = 0.5;

function fit(el: HTMLElement) {
  if (el.children.length) return;
  el.style.whiteSpace = "nowrap";
  // el tamaño que ya traía el botón (por clase de Tailwind, o inline en las tarjetas de la TV)
  if (el.dataset.fitInline === undefined) el.dataset.fitInline = el.style.fontSize;
  el.style.fontSize = el.dataset.fitInline;
  el.style.minHeight = "";
  // ancho del texto contra el ancho del botón menos un margen a cada lado (el mayor entre su relleno y 28 px), para que la letra nunca roce el borde
  const cs = getComputedStyle(el);
  const margin = Math.max(parseFloat(cs.paddingLeft) || 0, 28);
  const range = document.createRange();
  range.selectNodeContents(el);
  // un botón que se ajusta solo a su texto (ancho automático) no necesita achicar la letra: ya mide lo que su texto pide
  const natural = range.getBoundingClientRect().width + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
  // el ancho que de verdad tiene para su texto: el del botón, pero nunca más que el sitio libre del contenedor (un botón de ancho automático
  // con un texto largo se salía de la tarjeta y esta quedaba con barra horizontal)
  const parent = el.parentElement;
  const pcs = parent ? getComputedStyle(parent) : null;
  const room = parent && pcs ? parent.clientWidth - (parseFloat(pcs.paddingLeft) || 0) - (parseFloat(pcs.paddingRight) || 0) : Infinity;
  const avail = () => Math.min(el.clientWidth, room);
  if (Math.abs(el.offsetWidth - natural) <= 2 && el.offsetWidth <= room + 1) return;
  // si la tarjeta está entrando con una animación de escala, el texto medido en pantalla sale más chico que el botón: se mide sin esa escala
  const tooWide = () => {
    const scale = (el.getBoundingClientRect().width / (el.offsetWidth || 1)) || 1;
    return range.getBoundingClientRect().width / scale + 4 > avail() - 2 * margin;
  };
  if (!tooWide()) return;
  let size = parseFloat(cs.fontSize);
  if (!Number.isFinite(size)) return;
  const min = size * MIN;
  // la altura del botón con su letra normal: al achicar la letra se mantiene, así todos los botones miden lo mismo de alto
  const height = el.offsetHeight;
  while (tooWide() && size > min) {
    size -= 0.5;
    el.style.fontSize = `${size}px`;
  }
  if (el.offsetHeight < height) el.style.minHeight = `${height}px`;
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
    document.addEventListener("animationend", run, true);
    document.addEventListener("transitionend", run, true);
    const late = setTimeout(run, 600);
    document.fonts?.ready.then(run).catch(() => {});
    run();
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener("resize", run);
      document.removeEventListener("animationend", run, true);
      document.removeEventListener("transitionend", run, true);
      clearTimeout(late);
    };
  }, []);
  return null;
}
