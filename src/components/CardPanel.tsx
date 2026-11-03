"use client";

// ⚠️ LÍNEA DE DISEÑO DEL JUEGO (pedido del usuario): TODA ventana emergente (pop-up) que vea el público —avisos, páginas legales, ajustes,
// clasificatoria…— usa este panel, que es el de las tarjetas de casilla (`GameCard`): panel morado con borde grueso, pastilla verde biche
// arriba en el centro, cuadro verde con icono (o texto) a la izquierda del título en Lilita One mayúsculas, texto en Nunito Sans 700 y
// botones `.btn-game`. No inventes otro estilo de ventana: usa `CardPanel` y sus piezas (`CardText`, `CardHeading`, `CardList`).
// Se mide en `--u` (por defecto 16px; en la TV pasa `unit` en cqw/vw).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { iconMaskUrl, type IconName } from "@/editor/icons";

export const GREEN_LIGHT = "#bffa58";
export const GREEN = `linear-gradient(160deg, ${GREEN_LIGHT}, #5fc34a)`;
const u = (k: number) => `calc(var(--u) * ${k})`;

export default function CardPanel({
  kicker,
  title,
  icon,
  badge,
  children,
  actions,
  onClose,
  unit = "16px",
  label,
  z = "z-[10000]",
  solid,
  inline,
  width = 30,
  maxH = "88dvh",
  centerTitle,
}: {
  /** Pastilla verde de arriba («SOLO PARA ADULTOS», «PRIVACIDAD»…). */
  kicker?: string;
  title: string;
  /** Icono vectorial del cuadro verde… (sin icono ni texto no hay cuadro y el título ocupa toda la línea) */
  icon?: IconName;
  /** …o un texto corto en su lugar («+18»). */
  badge?: string;
  /** Contenido que se desplaza si es largo. */
  children: ReactNode;
  /** Botones de abajo (fuera del desplazamiento). */
  actions?: ReactNode;
  /** Con `onClose` se cierra con el fondo, Esc y el botón «CERRAR»; sin él la ventana no se puede cerrar (el aviso de +18). */
  onClose?: () => void;
  unit?: string;
  label?: string;
  z?: string;
  /** Fondo opaco (el aviso de +18 tapa todo el juego). */
  solid?: boolean;
  /** Sin ventana ni fondo: solo la tarjeta, para usarla como parte de una pantalla (la sala de espera de la TV). */
  inline?: boolean;
  /** Ancho máximo en `--u` (30 por defecto). */
  width?: number;
  /** Alto máximo de la tarjeta (el contenido se desplaza dentro). */
  maxH?: string;
  /** Título centrado (para tarjetas sin icono ni pastilla, como el alta de jugadores). */
  centerTitle?: boolean;
}) {
  const downOnBackdrop = useRef(false);
  // se dibuja directamente en <body> (un portal): así nunca queda dentro de un <p>, de un contenedor con transform ni bajo otro z-index
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // (iconMaskUrl usa el DOM: se calcula después de comprobar que ya estamos en el navegador)
  if (!mounted) return null;
  const mask = icon ? iconMaskUrl(icon, 256) : null;
  const maskStyle = (url: string) => ({ WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" });

  const card = (
      <div className="card-pop relative w-full text-left" style={{ ["--u" as string]: unit, maxWidth: u(width), paddingTop: u(0.9), filter: `drop-shadow(0 ${u(0.4)} ${u(0.6)} rgba(0,0,0,.55))` }}>
        <div style={{ borderRadius: u(1.1), border: `${u(0.32)} solid #452b8e`, background: "linear-gradient(180deg, #2f1768 0%, #29155a 50%, #210f4d 100%)" }}>
          <div className="flex flex-col" style={{ maxHeight: maxH, padding: `${u(1.9)} ${u(1.4)} ${u(1.4)}`, gap: u(1) }}>
            <div className="flex shrink-0 items-center" style={{ gap: u(1.1) }}>
              {(mask || badge) && (
              <div className="grid shrink-0 place-items-center" style={{ width: u(4), height: u(4), minWidth: u(4), minHeight: u(4), borderRadius: u(0.9), background: GREEN }}>
                {mask ? (
                  <div style={{ width: u(3.9), height: u(3.9), background: "#14260a", ...maskStyle(mask) }} />
                ) : (
                  <span className="font-display leading-none" style={{ color: "#14260a", fontSize: u(1.7) }}>
                    {badge}
                  </span>
                )}
              </div>
              )}
              <h2 className={`min-w-0 font-display leading-[1.05] text-white uppercase${centerTitle ? " w-full text-center" : ""}`} style={{ fontSize: u(1.9), textWrap: "balance", letterSpacing: "0.01em" }}>
                {title}
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ paddingRight: u(0.3) }}>
              {children}
            </div>

            {(actions || onClose) && (
              <div className="flex shrink-0 flex-col" style={{ gap: u(0.7) }}>
                {actions}
                {onClose && !actions && (
                  <button onClick={onClose} className="btn-game bg-btn-green py-3 text-xl text-white">
                    CERRAR
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {kicker && <div className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap font-display uppercase" style={{ padding: `${u(0.2)} ${u(1)}`, borderRadius: u(9), background: GREEN, color: "#14260a", fontSize: u(0.95), letterSpacing: "0.04em" }}>
          {kicker}
        </div>}
      </div>
  );
  if (inline) return card;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label ?? title}
      className={`fixed inset-0 ${z} grid place-items-center px-4 py-6 ${solid ? "bg-[#0a0620]" : "bg-[#090620]/90"}`}
      onMouseDown={(e) => (downOnBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => {
        // solo cierra si el clic empezó Y terminó en el fondo (arrastrar para seleccionar texto no la cierra)
        const fromBackdrop = downOnBackdrop.current && e.target === e.currentTarget;
        downOnBackdrop.current = false;
        if (fromBackdrop) onClose?.();
      }}
    >
      {card}
    </div>,
    document.body,
  );
}

const body = (k: number) => ({ fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700, fontSize: u(k), lineHeight: 1.4, letterSpacing: 0, color: "#d8d4f6" });

/** Párrafo con la letra de las tarjetas. */
export function CardText({ children, size = 1.12, className = "" }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <p className={className} style={{ ...body(size), marginTop: u(0.7) }}>
      {children}
    </p>
  );
}

/** Subtítulo de sección (Lilita One, verde biche). */
export function CardHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display uppercase" style={{ marginTop: u(1.3), fontSize: u(1.25), color: GREEN_LIGHT, letterSpacing: "0.02em" }}>
      {children}
    </h3>
  );
}

/** Lista con viñetas verdes. */
export function CardList({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ marginTop: u(0.6), display: "flex", flexDirection: "column", gap: u(0.55) }}>
      {items.map((it, i) => (
        <li key={i} className="flex items-start" style={{ gap: u(0.7), ...body(1.08) }}>
          <span aria-hidden style={{ flex: "none", marginTop: u(0.5), width: u(0.55), height: u(0.55), borderRadius: u(0.2), background: GREEN }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Texto pequeño y apagado (fecha, notas). */
export function CardNote({ children }: { children: ReactNode }) {
  return <p style={{ ...body(0.9), marginTop: u(0.7), opacity: 0.65 }}>{children}</p>;
}
