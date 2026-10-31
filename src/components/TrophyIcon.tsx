// Iconos de las copitas de la tarjeta de usuario: copas y estrellas de 5 puntas (finas, gorditas, redondeadas…) con un contorno de color.
// Se dibuja en una caja de 512; cada pieza se pinta dos veces (primero el contorno grueso y luego el relleno). Elegibles desde el editor.
const YELLOW = "#ffc82e";
const OUTLINE = "#2a0f5c";

/** Estrella de 5 puntas: `inner` = radio interior / exterior (0,3 muy fina · 0,38 clásica · 0,6 gordita). */
function star(inner: number, R = 240): string {
  const cx = 256;
  const cy = 268;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? R : R * inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

export type TrophyId = "copa" | "copaFina" | "copaAsas" | "estrella" | "estrellaGorda" | "estrellaRedonda" | "estrellaGordaRedonda" | "estrellaFina";

/** `round`: grosor extra (en unidades del dibujo) que redondea las puntas; el dibujo ya viene un poco más pequeño para compensarlo. */
export const TROPHIES: Record<TrophyId, { label: string; parts: string[]; round?: number }> = {
  copa: {
    label: "Copa con asas",
    parts: [
      "M125 0H387V120C387 230 330 312 256 312C182 312 125 230 125 120Z",
      "M36 46H125V204H110C70 204 36 170 36 130ZM80 92H125V158C100 158 80 140 80 120Z",
      "M476 46H387V204H402C442 204 476 170 476 130ZM432 92H387V158C412 158 432 140 432 120Z",
      "M228 300H284V390H228Z",
      "M190 386H322Q334 386 334 398V430H178V398Q178 386 190 386Z",
      "M152 428H360V512H152Z",
    ],
  },
  copaFina: {
    label: "Copa elegante",
    parts: [
      "M130 20H382C382 190 330 270 256 270C182 270 130 190 130 20Z",
      "M236 256H276V400H236Z",
      "M150 450Q150 400 200 400H312Q362 400 362 450V492H150Z",
    ],
  },
  copaAsas: {
    label: "Copa de asas grandes",
    parts: [
      "M110 40H402V190C402 270 340 330 256 330C172 330 110 270 110 190Z",
      "M110 80H60Q10 80 10 140Q10 230 90 260L110 240Q50 215 50 140Q50 120 70 120H110Z",
      "M402 80H452Q502 80 502 140Q502 230 422 260L402 240Q462 215 462 140Q462 120 442 120H402Z",
      "M226 320H286V410H226Z",
      "M130 410H382V492H130Z",
    ],
  },
  estrella: { label: "Estrella clásica", parts: [star(0.4)] },
  estrellaGorda: { label: "Estrella gordita", parts: [star(0.62)] },
  estrellaFina: { label: "Estrella fina", parts: [star(0.3)] },
  estrellaRedonda: { label: "Estrella redondeada", parts: [star(0.42, 205)], round: 70 },
  estrellaGordaRedonda: { label: "Estrella gordita redondeada", parts: [star(0.64, 200)], round: 80 },
};
export const TROPHY_IDS = Object.keys(TROPHIES) as TrophyId[];

export default function TrophyIcon({
  size = 24,
  className = "",
  fill = YELLOW,
  outline = OUTLINE,
  stroke = 44,
  icon = "copa",
}: {
  size?: number | string;
  className?: string;
  fill?: string;
  outline?: string;
  stroke?: number;
  icon?: TrophyId;
}) {
  const def = TROPHIES[icon] ?? TROPHIES.copa;
  const round = def.round ?? 0;
  const pad = 24; // fijo: un contorno muy grueso sobresale de la caja (overflow visible) en vez de achicar la figura
  return (
    <svg viewBox={`${-pad} ${-pad} ${512 + 2 * pad} ${512 + 2 * pad}`} width={size} height={size} className={className} aria-hidden focusable="false" style={{ display: "inline-block", verticalAlign: "middle", overflow: "visible" }}>
      <g fillRule="evenodd" strokeLinejoin="round">
        {stroke > 0 &&
          def.parts.map((d, i) => <path key={`o${i}`} d={d} fill={outline} stroke={outline} strokeWidth={stroke + round} />)}
        {def.parts.map((d, i) => (
          <path key={`f${i}`} d={d} fill={fill} stroke={round ? fill : "none"} strokeWidth={round} />
        ))}
      </g>
    </svg>
  );
}
