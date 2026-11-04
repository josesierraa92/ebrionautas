"use client";

// Botón de pantalla completa del celular. Donde el navegador lo permite (Android, iPad, PC) alterna la pantalla completa; en el iPhone,
// que no lo permite en una página web, enseña cómo abrir el juego a pantalla completa desde el icono de la pantalla de inicio.
import { useEffect, useState } from "react";
import CardPanel, { CardList, CardText } from "@/components/CardPanel";

type FsDoc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

const canFullscreen = () => {
  const d = document as FsDoc;
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
};
const isFullscreen = () => {
  const d = document as FsDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
};

export default function FullscreenButton() {
  const [state, setState] = useState<"hidden" | "native" | "help">("hidden");
  const [full, setFull] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    // ya abierto desde el icono de la pantalla de inicio: está a pantalla completa y no hace falta el botón
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setState(standalone ? "hidden" : canFullscreen() ? "native" : "help");
    const onChange = () => setFull(isFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  if (state === "hidden") return null;

  const toggle = () => {
    if (state === "help") return setHelp(true);
    const d = document as FsDoc;
    const el = document.documentElement as FsEl;
    if (isFullscreen()) (d.exitFullscreen ?? d.webkitExitFullscreen)?.call(d)?.catch?.(() => {});
    else (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {});
  };

  return (
    <>
      <button onClick={toggle} aria-label={full ? "Salir de pantalla completa" : "Pantalla completa"} className="btn-game grid shrink-0 place-items-center bg-btn-grey px-2 py-1 text-white md:px-3 md:py-2">
        <svg viewBox="0 0 24 24" width="28" height="28" className="h-[22px] w-[22px] md:h-7 md:w-7" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {full ? <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" /> : <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />}
        </svg>
      </button>
      {help && (
        <CardPanel kicker="Pantalla completa" title="En el iPhone" centerTitle unit="17px" z="z-[70]" onClose={() => setHelp(false)}>
          <CardText size={1.05}>Safari no deja poner una página a pantalla completa, pero puedes guardar el juego como app y abrirlo sin barras:</CardText>
          <CardList
            items={[
              "Toca el botón de compartir de Safari.",
              "Elige «Añadir a pantalla de inicio».",
              "Abre Muertos de Sed desde ese icono: sale a pantalla completa.",
            ]}
          />
        </CardPanel>
      )}
    </>
  );
}
