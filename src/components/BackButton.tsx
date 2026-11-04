"use client";

// Botón «volver / atrás» con el estilo del juego: botón gris redondeado (`.btn-game`) con una flecha gruesa dibujada (no un carácter de texto).
import Link from "next/link";

type Props = {
  /** Texto del botón (por defecto «VOLVER»). */
  label?: string;
  /** Si lleva `href` es un enlace; si no, un botón con `onClick`. */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Tamaño de letra y de flecha (CSS). */
  size?: string;
  className?: string;
};

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="1.25em" height="1.25em" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 5 3.5 12 10 19" />
      <path d="M4 12h16" />
    </svg>
  );
}

export default function BackButton({ label = "Volver", href, onClick, disabled, size = "max(0.9rem, min(1.15vw, 2vh))", className = "" }: Props) {
  const cls = `btn-game inline-flex items-center justify-center gap-[0.45em] whitespace-nowrap bg-btn-grey uppercase text-white disabled:opacity-50 ${className}`;
  const style = { fontSize: size, padding: "0.35em 0.95em 0.35em 0.7em" };
  const body = (
    <>
      <Arrow />
      <span>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className={cls} style={style}>
      {body}
    </Link>
  ) : (
    <button onClick={onClick} disabled={disabled} className={cls} style={style}>
      {body}
    </button>
  );
}
