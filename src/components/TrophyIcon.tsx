// Copa amarilla con la silueta de la referencia del usuario (copa redonda, dos asas con hueco, tallo y base de dos escalones) y un borde
// morado oscuro. Se usa en vez del emoji 🏆 en todo el juego (PC y celular).
const YELLOW = "#ffc82e";
const OUTLINE = "#2a0f5c";

const PARTS = [
  // copa
  "M125 0H387V120C387 230 330 312 256 312C182 312 125 230 125 120Z",
  // asas (con hueco) izquierda y derecha
  "M36 46H125V204H110C70 204 36 170 36 130ZM80 92H125V158C100 158 80 140 80 120Z",
  "M476 46H387V204H402C442 204 476 170 476 130ZM432 92H387V158C412 158 432 140 432 120Z",
  // tallo y base
  "M228 300H284V390H228Z",
  "M190 386H322Q334 386 334 398V430H178V398Q178 386 190 386Z",
  "M152 428H360V512H152Z",
];

export default function TrophyIcon({ size = 24, className = "", fill = YELLOW, outline = OUTLINE, stroke = 44 }: { size?: number | string; className?: string; fill?: string; outline?: string; stroke?: number }) {
  const pad = Math.max(24, stroke / 2 + 2);
  return (
    <svg viewBox={`${-pad} ${-pad} ${512 + 2 * pad} ${512 + 2 * pad}`} width={size} height={size} className={className} aria-hidden focusable="false" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <g fillRule="evenodd" strokeLinejoin="round">
        {stroke > 0 && PARTS.map((d, i) => (
          <path key={`o${i}`} d={d} fill={outline} stroke={outline} strokeWidth={stroke} />
        ))}
        {PARTS.map((d, i) => (
          <path key={`f${i}`} d={d} fill={fill} />
        ))}
      </g>
    </svg>
  );
}
