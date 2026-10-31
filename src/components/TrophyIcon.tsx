// Copa amarilla en el estilo de los zombis (Kenney, bloques lisos de colores planos): pocas piezas grandes, sin contornos ni degradados,
// solo un tono claro y otro más oscuro por pieza. Se usa en vez del emoji 🏆 en todo el juego (PC y celular).
const LIGHT = "#ffd23f";
const MID = "#f2a900";
const DARK = "#c47f00";

export default function TrophyIcon({ size = 24, className = "" }: { size?: number | string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden focusable="false" style={{ display: "inline-block", verticalAlign: "middle" }}>
      {/* asas: dos bloques */}
      <polygon points="6,12 18,12 18,18 12,18 12,26 18,26 18,32 6,32" fill={DARK} />
      <polygon points="58,12 46,12 46,18 52,18 52,26 46,26 46,32 58,32" fill={DARK} />
      {/* copa: bloque ancho que se estrecha, mitad clara y mitad oscura */}
      <polygon points="14,6 32,6 32,38 24,38" fill={LIGHT} />
      <polygon points="50,6 32,6 32,38 40,38" fill={MID} />
      {/* tallo */}
      <rect x="27" y="38" width="10" height="10" fill={MID} />
      <rect x="27" y="38" width="5" height="10" fill={LIGHT} />
      {/* base */}
      <rect x="16" y="48" width="32" height="10" fill={DARK} />
      <rect x="16" y="48" width="16" height="10" fill={MID} />
    </svg>
  );
}
