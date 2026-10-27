import { useId } from "react";

// Íconos de las casillas con estética de videojuego móvil (ver referencia del
// plan §5.1): contorno azul marino grueso, relleno en dos tonos (claro arriba,
// oscuro abajo), brillo blanco y sombra sólida (la pone el CSS `.game-icon`).

export const INK = "#1b1f4b";

type IconProps = { className?: string };

/** Degradado vertical con corte duro: claro arriba, base, y sombra abajo. */
function Shade({ id, light, base, dark, cut = 0.58 }: { id: string; light: string; base: string; dark: string; cut?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={light} />
      <stop offset={cut} stopColor={base} />
      <stop offset={cut} stopColor={dark} />
      <stop offset="1" stopColor={dark} />
    </linearGradient>
  );
}

function useIds<T extends string>(...names: T[]): Record<T, string> {
  const base = useId().replace(/:/g, "");
  return Object.fromEntries(names.map((n) => [n, `${base}-${n}`])) as Record<T, string>;
}

const Svg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 100 100" className={`game-icon ${className ?? ""}`} aria-hidden>
    <g stroke={INK} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
      {children}
    </g>
  </svg>
);

/** Brillo blanco semitransparente, sin contorno. */
const Gloss = ({ d }: { d: string }) => <path d={d} fill="#fff" opacity=".55" stroke="none" />;

export function RocketIcon({ className }: IconProps) {
  const id = useIds("body", "red", "flame", "glass");
  return (
    <Svg className={className}>
      <defs>
        <Shade id={id.body} light="#ffffff" base="#e9edf7" dark="#b9c2d8" />
        <Shade id={id.red} light="#ff7a8a" base="#ef3b55" dark="#b81c39" />
        <Shade id={id.flame} light="#fff3a0" base="#ffc61a" dark="#ff7a1a" cut={0.5} />
        <Shade id={id.glass} light="#bff0ff" base="#4fc3ff" dark="#1f7fd6" />
      </defs>
      <g transform="rotate(40 50 50)">
        <path d="M42 78 Q50 100 58 78 Z" fill={`url(#${id.flame})`} />
        <path d="M34 62 L22 78 L36 76 Z" fill={`url(#${id.red})`} />
        <path d="M66 62 L78 78 L64 76 Z" fill={`url(#${id.red})`} />
        <path d="M50 6 C66 18 70 42 66 76 L34 76 C30 42 34 18 50 6 Z" fill={`url(#${id.body})`} />
        <path d="M50 6 C58 12 63 20 65 28 L35 28 C37 20 42 12 50 6 Z" fill={`url(#${id.red})`} />
        <circle cx="50" cy="48" r="10" fill={`url(#${id.glass})`} />
        <Gloss d="M44 46 a6 6 0 0 1 6 -6 a3 3 0 0 1 0 4 a3 3 0 0 0 -3 3 a2 2 0 0 1 -3 -1 Z" />
        <Gloss d="M40 34 Q40 20 47 13 Q44 24 44 34 Z" />
      </g>
    </Svg>
  );
}

export function WineIcon({ className }: IconProps) {
  const id = useIds("glass", "wine", "foot");
  return (
    <Svg className={className}>
      <defs>
        <Shade id={id.glass} light="#ffffff" base="#d9f3ff" dark="#a9d8f0" />
        <Shade id={id.wine} light="#ff5c7a" base="#c8143c" dark="#7d0a2a" cut={0.45} />
        <Shade id={id.foot} light="#ffffff" base="#d9f3ff" dark="#9cc6dc" />
      </defs>
      <path d="M30 92 Q50 84 70 92 Q50 98 30 92 Z" fill={`url(#${id.foot})`} />
      <path d="M46 62 L46 88 L54 88 L54 62 Z" fill={`url(#${id.foot})`} />
      <path d="M22 10 L78 10 Q82 44 62 60 Q50 68 38 60 Q18 44 22 10 Z" fill={`url(#${id.glass})`} />
      <path d="M24 30 Q50 38 76 30 Q74 50 60 58 Q50 64 40 58 Q26 50 24 30 Z" fill={`url(#${id.wine})`} />
      <Gloss d="M30 16 Q28 34 36 48 Q30 46 27 34 Q26 22 30 16 Z" />
      <circle cx="58" cy="44" r="3" fill="#fff" opacity=".7" stroke="none" />
      <circle cx="50" cy="50" r="2" fill="#fff" opacity=".7" stroke="none" />
    </Svg>
  );
}

/** Dos dados en perspectiva. */
export function DiceIcon({ className }: IconProps) {
  const pip = (cx: number, cy: number, rx = 4, ry = 2.6, rot = 0) => (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={INK} stroke="none" transform={`rotate(${rot} ${cx} ${cy})`} />
  );
  const cube = (x: number, y: number, s: number, pips: React.ReactNode) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 14 L26 0 L52 14 L26 28 Z" fill="#ffffff" />
      <path d="M0 14 L26 28 L26 58 L0 44 Z" fill="#dfe4f0" />
      <path d="M52 14 L26 28 L26 58 L52 44 Z" fill="#b9c2d8" />
      {pips}
    </g>
  );
  return (
    <Svg className={className}>
      {cube(42, 30, 1.05, <>{pip(26, 14, 5, 3)}{pip(13, 36, 3, 4, 25)}{pip(39, 30, 3, 4, -25)}{pip(39, 48, 3, 4, -25)}</>)}
      {cube(4, 12, 1, <>{pip(16, 10, 4, 2.4)}{pip(36, 18, 4, 2.4)}{pip(13, 36, 3, 4, 25)}{pip(39, 36, 3, 4, -25)}</>)}
    </Svg>
  );
}

/** La Oca Espacial: cabeza de oca con casco de astronauta. */
export function GooseIcon({ className }: IconProps) {
  const id = useIds("body", "beak", "helmet", "ring");
  return (
    <Svg className={className}>
      <defs>
        <Shade id={id.body} light="#ffffff" base="#ffffff" dark="#dfe5f2" cut={0.62} />
        <Shade id={id.beak} light="#ffd27a" base="#ffa51c" dark="#ee6f00" cut={0.5} />
        <radialGradient id={id.helmet} cx="0.35" cy="0.3">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".9" />
          <stop offset="0.5" stopColor="#bfeaff" stopOpacity=".45" />
          <stop offset="1" stopColor="#5cc4f5" stopOpacity=".6" />
        </radialGradient>
        <Shade id={id.ring} light="#d0d6e4" base="#a9b3c9" dark="#7d88a3" cut={0.5} />
      </defs>
      {/* cuello */}
      <path d="M36 98 Q30 74 42 62 Q50 56 52 46 L66 50 Q66 64 58 72 Q52 80 56 98 Z" fill={`url(#${id.body})`} />
      {/* cabeza y pico */}
      <path d="M58 42 L94 46 Q92 54 80 56 L60 54 Z" fill={`url(#${id.beak})`} />
      <circle cx="50" cy="40" r="20" fill={`url(#${id.body})`} />
      <circle cx="55" cy="35" r="5" fill={INK} stroke="none" />
      <circle cx="56.8" cy="33.2" r="1.8" fill="#fff" stroke="none" />
      <ellipse cx="47" cy="46" rx="5" ry="3" fill="#ff9ecb" opacity=".7" stroke="none" />
      {/* casco */}
      <circle cx="50" cy="40" r="31" fill={`url(#${id.helmet})`} />
      <path d="M22 54 Q50 78 78 54 L80 62 Q50 86 20 62 Z" fill={`url(#${id.ring})`} />
      <Gloss d="M30 22 Q40 12 54 11 Q40 16 34 28 Z" />
    </Svg>
  );
}

/** Calabozo: sirena de la policía intergaláctica. */
export function SirenIcon({ className }: IconProps) {
  const id = useIds("dome", "base");
  return (
    <Svg className={className}>
      <defs>
        <Shade id={id.dome} light="#ff8a9a" base="#ef3b55" dark="#b81c39" cut={0.62} />
        <Shade id={id.base} light="#8a99b0" base="#5c6b80" dark="#3a4658" cut={0.5} />
      </defs>
      <g strokeWidth="5">
        <path d="M14 30 L6 24 M86 30 L94 24 M50 12 L50 2 M24 16 L18 8 M76 16 L82 8" />
      </g>
      <path d="M18 82 L82 82 L86 94 L14 94 Z" fill={`url(#${id.base})`} />
      <path d="M24 82 L24 52 Q24 24 50 24 Q76 24 76 52 L76 82 Z" fill={`url(#${id.dome})`} />
      <rect x="40" y="46" width="20" height="30" rx="6" fill="#fff4b0" />
      <Gloss d="M32 52 Q32 34 46 30 Q38 40 38 54 Z" />
    </Svg>
  );
}

/** Agujero negro con disco de acreción. */
export function BlackHoleIcon({ className }: IconProps) {
  const id = useIds("disk", "core");
  return (
    <Svg className={className}>
      <defs>
        <Shade id={id.disk} light="#ffe066" base="#ff8a1f" dark="#e53fd6" cut={0.5} />
        <radialGradient id={id.core}>
          <stop offset="0" stopColor="#000" />
          <stop offset="0.7" stopColor="#1a0b3a" />
          <stop offset="1" stopColor="#6a2bd6" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="54" rx="46" ry="20" fill={`url(#${id.disk})`} transform="rotate(-12 50 54)" />
      <circle cx="50" cy="50" r="26" fill={`url(#${id.core})`} />
      <path d="M8 62 Q50 82 92 46" fill="none" strokeWidth="5" />
      <path d="M12 60 Q50 76 88 46" fill="none" stroke="#ffe066" strokeWidth="3" />
      <path d="M38 40 Q48 32 60 38" fill="none" stroke="#b98bf0" strokeWidth="3" opacity=".8" />
    </Svg>
  );
}

/** Resbalón: Saturno con sus anillos. */
export function SaturnIcon({ className }: IconProps) {
  const id = useIds("planet", "ring");
  // El anillo se dibuja en dos mitades: la de atrás antes del planeta y la de delante después.
  const ring = "M4 58 Q4 44 50 42 Q96 44 96 58 Q96 72 50 74 Q4 72 4 58 Z M16 58 Q18 64 50 65 Q82 64 84 58 Q82 52 50 51 Q18 52 16 58 Z";
  return (
    <Svg className={className}>
      <defs>
        <Shade id={id.planet} light="#ffd28a" base="#ff9f1c" dark="#e26a00" />
        <Shade id={id.ring} light="#fff4b0" base="#ffe066" dark="#e8b800" cut={0.5} />
        <clipPath id={`${id.ring}-back`}>
          <rect x="0" y="0" width="100" height="58" />
        </clipPath>
        <clipPath id={`${id.ring}-front`}>
          <rect x="0" y="58" width="100" height="42" />
        </clipPath>
      </defs>
      <g transform="rotate(-14 50 54)">
        <path d={ring} fillRule="evenodd" fill={`url(#${id.ring})`} clipPath={`url(#${id.ring}-back)`} />
        <circle cx="50" cy="54" r="27" fill={`url(#${id.planet})`} />
        <path d="M26 46 Q50 41 74 46 M24 62 Q50 57 76 62" fill="none" stroke="#c45a00" strokeWidth="3.5" />
        <Gloss d="M34 36 Q44 28 58 29 Q44 33 38 43 Z" />
        <path d={ring} fillRule="evenodd" fill={`url(#${id.ring})`} clipPath={`url(#${id.ring}-front)`} />
      </g>
    </Svg>
  );
}

/** Logo con letras gruesas, degradado y relieve (como el logo de la referencia). */
export function GameLogo({ className, lines = ["EBRIO", "NAUTAS"] }: { className?: string; lines?: [string, string] | string[] }) {
  const id = useIds("top", "bottom");
  return (
    <svg viewBox="0 0 400 210" className={className} role="img" aria-label="Muertos de Sed">
      <defs>
        <linearGradient id={id.top} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6a8" />
          <stop offset="0.45" stopColor="#ffd23f" />
          <stop offset="0.55" stopColor="#ffb000" />
          <stop offset="1" stopColor="#ff7a00" />
        </linearGradient>
        <linearGradient id={id.bottom} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfeaff" />
          <stop offset="0.45" stopColor="#4fb3ff" />
          <stop offset="0.55" stopColor="#2a7bf5" />
          <stop offset="1" stopColor="#1f4bd6" />
        </linearGradient>
      </defs>
      {lines.map((text, i) => {
        const y = i === 0 ? 92 : 190;
        const size = i === 0 ? 96 : 104;
        const common = {
          x: 200,
          textAnchor: "middle" as const,
          fontFamily: "var(--font-lilita), sans-serif",
          fontSize: size,
          letterSpacing: 2,
          transform: `rotate(${i === 0 ? -4 : -2} 200 ${y})`,
        };
        return (
          <g key={i}>
            {/* relieve: varias copias desplazadas hacia abajo */}
            {[14, 11, 8].map((d) => (
              <text key={d} {...common} y={y + d} fill={INK} stroke={INK} strokeWidth="14" strokeLinejoin="round">
                {text}
              </text>
            ))}
            <text {...common} y={y} fill={`url(#${i === 0 ? id.top : id.bottom})`} stroke={INK} strokeWidth="12" strokeLinejoin="round" paintOrder="stroke">
              {text}
            </text>
            <text {...common} y={y} fill="#fff" opacity=".35" style={{ clipPath: "inset(0 0 62% 0)" }}>
              {text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
