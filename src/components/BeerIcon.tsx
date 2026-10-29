// Cerveza: botella en contorno blanco con una etiqueta cuadrada y una X en el medio. Sustituye a la copa 🍷 en todo el juego
// (contador de tragos, «bebe»…): los iconos van siempre solo en contorno, sin relleno.
export default function BeerIcon({ className = "", size = "1.1em" }: { className?: string; size?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`inline-block align-[-0.18em] ${className}`} fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M27 5h10v13l7 9v29a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V27l7-9z" />
      <rect x="25" y="32" width="14" height="14" rx="1.5" />
      <path d="M29 36l6 6M35 36l-6 6" />
    </svg>
  );
}
