// Logo «Muertos de Sed» (public/art/logo.webp, dado por el usuario, fondo transparente). Sustituye al texto «MUERTOS DE SED» en las
// cabeceras horizontales (TV: sala de espera y partida; /jugar). La portada (`page.tsx`) ya lo trae dentro de su imagen.
export default function Logo({ className = "" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/art/logo.webp" alt="Muertos de Sed" draggable={false} className={`block h-auto select-none ${className}`} />;
}
