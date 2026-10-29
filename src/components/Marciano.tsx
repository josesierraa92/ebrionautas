import { useId } from "react";
import type { AvatarConfig, Expression } from "@/game/avatar";
import { CHARACTERS, SHEET_COLS, STOCK_SHEET } from "@/game/characters";
import { alienArt } from "@/game/tileStyle";
import { useTokenArt } from "@/lib/usePublishedBoard";

const INK = "#1b1f4b";
const BODY = "M50 14 C77 14 88 40 88 66 C88 90 72 100 50 100 C28 100 12 90 12 66 C12 40 23 14 50 14 Z";

type Props = {
  avatar: AvatarConfig;
  expression?: Expression;
  size?: number;
  className?: string;
  title?: string;
  /** Parpadea (y respira, según la clase que se le pase). */
  animated?: boolean;
  /** Personaje zombi del jugador (characterOf): se dibuja él en vez del zombi de serie, salvo ficha propia del editor. */
  character?: number;
};

/**
 * El Marciano en SVG por capas (de atrás hacia delante): sombra, aura, patas y
 * brazos, cuerpo + patrón, disfraz (parte trasera), cara, disfraz (parte delantera).
 */
export default function Marciano({ avatar, expression = "normal", size = 64, className, title, animated = false, character }: Props) {
  const clip = `body-${useId().replace(/:/g, "")}`;
  const dark = shade(avatar.skin, -0.25);
  const { costume } = avatar;
  const art = useTokenArt(avatar.skin);

  // Personaje zombi (hombre o mujer) de la hoja de serie, de frente y quieto; recortado a su altura
  if (character != null && art === alienArt(avatar.skin)) {
    const { cw, ch, feet, span, image } = STOCK_SHEET;
    const y1 = Math.min(ch, (feet + 0.05) * ch);
    const y0 = Math.max(0, y1 - (1.05 / span) * ch);
    const vw = Math.min(cw, ((y1 - y0) * 108) / 124); // mismo encuadre que el retrato (108×124)
    return (
      <svg viewBox="-4 -14 108 128" width={size} height={size * (128 / 108)} className={className} role="img" aria-label={title ?? "Zombi"}>
        {title && <title>{title}</title>}
        <ellipse cx="50" cy="108" rx="30" ry="5" fill="#000" opacity=".25" />
        <svg x={-4} y={-14} width={108} height={124} viewBox={`${(cw - vw) / 2} ${character * ch + y0} ${vw} ${y1 - y0}`} preserveAspectRatio="xMidYMax meet" opacity={expression === "triste" ? 0.75 : 1}>
          <image href={image} width={cw * SHEET_COLS} height={ch * CHARACTERS.length} />
        </svg>
      </svg>
    );
  }

  // Los colores de jugador tienen su marciano 3D; el dibujo en SVG queda para cualquier otro color.
  if (art) {
    return (
      <svg viewBox="-4 -14 108 128" width={size} height={size * (128 / 108)} className={className} role="img" aria-label={title ?? "Marciano"}>
        {title && <title>{title}</title>}
        <ellipse cx="50" cy="108" rx="30" ry="5" fill="#000" opacity=".25" />
        {expression === "abducido" && <circle cx="50" cy="58" r="52" fill="#f15bb5" opacity=".25" />}
        <image href={art} x={-4} y={-14} width={108} height={124} preserveAspectRatio="xMidYMax meet" opacity={expression === "triste" ? 0.75 : 1} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="-4 -14 108 128"
      width={size}
      height={size * (128 / 108)}
      className={`${animated ? "mc-anim" : ""} ${className ?? ""}`}
      // Cada marciano parpadea a su ritmo: el retraso sale de su color.
      style={animated ? ({ "--blink-delay": `${(parseInt(avatar.skin.slice(1), 16) % 40) / 10}s` } as React.CSSProperties) : undefined}
      role="img"
      aria-label={title ?? "Marciano"}
    >
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={clip}>
          <path d={BODY} />
        </clipPath>
      </defs>

      <ellipse cx="50" cy="108" rx="30" ry="5" fill="#000" opacity=".25" />
      {expression === "abducido" && <circle cx="50" cy="58" r="52" fill="#f15bb5" opacity=".25" />}

      {/* patas y brazos */}
      <ellipse cx="37" cy="100" rx="11" ry="7" fill={dark} stroke={INK} strokeWidth="4" />
      <ellipse cx="63" cy="100" rx="11" ry="7" fill={dark} stroke={INK} strokeWidth="4" />
      <ellipse cx="13" cy="66" rx="7" ry="12" fill={avatar.skin} stroke={INK} strokeWidth="4" transform={expression === "euforico" ? "rotate(35 13 56)" : "rotate(15 13 66)"} />
      <ellipse cx="87" cy="66" rx="7" ry="12" fill={avatar.skin} stroke={INK} strokeWidth="4" transform={expression === "euforico" ? "rotate(-35 87 56)" : "rotate(-15 87 66)"} />

      {costume === "marciano" && <Antennas skin={avatar.skin} tangled={expression === "mareado"} />}
      {costume === "oca" && <path d="M44 16 Q46 4 50 10 Q53 2 56 16" fill="#fff" stroke={INK} strokeWidth="3" />}

      {/* cuerpo */}
      <path d={BODY} fill={avatar.skin} />
      <g clipPath={`url(#${clip})`}>
        <Pattern pattern={avatar.pattern} color={dark} />
        {costume === "preso" && <Stripes />}
        {costume === "calavera" && <path d="M22 30 Q50 18 78 30 L80 62 Q50 74 20 62 Z" fill="#fff" opacity=".9" />}
        <ellipse cx="34" cy="30" rx="12" ry="7" fill="#fff" opacity=".35" />
      </g>
      <path d={BODY} fill="none" stroke={INK} strokeWidth="4" />

      <Face avatar={avatar} expression={expression} />

      {costume === "oca" && <path d="M38 60 L62 60 L50 74 Z" fill="#ff8a1f" stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
      {costume === "preso" && <PrisonerExtras />}
      {costume === "calavera" && <Sombrero />}
      {costume === "mago" && <WizardHat />}
      {costume === "pirata" && <PirateHat />}
      {expression === "chulo" && <Sunglasses />}
      {expression === "triste" && <path d="M68 56 Q72 64 68 68 Q64 64 68 56 Z" fill="#7fd3ff" stroke={INK} strokeWidth="1.5" />}
    </svg>
  );
}

function Antennas({ skin, tangled }: { skin: string; tangled: boolean }) {
  return tangled ? (
    <g fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round">
      <path d="M40 18 Q30 2 48 4 Q62 6 54 -6" />
      <path d="M60 18 Q72 4 56 2 Q42 0 50 -8" />
      <circle cx="54" cy="-7" r="5" fill={skin} />
      <circle cx="50" cy="-9" r="5" fill={skin} />
    </g>
  ) : (
    <g fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round">
      <path d="M40 18 L30 0" />
      <path d="M60 18 L70 0" />
      <circle cx="30" cy="-2" r="6" fill={skin} />
      <circle cx="70" cy="-2" r="6" fill={skin} />
    </g>
  );
}

function Pattern({ pattern, color }: { pattern: AvatarConfig["pattern"]; color: string }) {
  if (pattern === "manchas")
    return (
      <g fill={color} opacity=".55">
        <circle cx="26" cy="80" r="7" />
        <circle cx="72" cy="40" r="6" />
        <circle cx="66" cy="86" r="5" />
        <circle cx="20" cy="50" r="4" />
      </g>
    );
  if (pattern === "rayas")
    return (
      <g stroke={color} strokeWidth="5" opacity=".5">
        <path d="M0 80 L100 74" />
        <path d="M0 92 L100 86" />
        <path d="M0 26 L100 20" />
      </g>
    );
  if (pattern === "escamas")
    return (
      <g fill="none" stroke={color} strokeWidth="2.5" opacity=".6">
        {[22, 36, 50, 64, 78].map((x) => (
          <path key={x} d={`M${x - 7} 84 Q${x} 76 ${x + 7} 84`} />
        ))}
        {[29, 43, 57, 71].map((x) => (
          <path key={x} d={`M${x - 7} 92 Q${x} 84 ${x + 7} 92`} />
        ))}
      </g>
    );
  return null;
}

function Face({ avatar, expression }: { avatar: AvatarConfig; expression: Expression }) {
  const eyeless = avatar.costume === "pirata"; // el parche tapa un ojo: se dibuja en el sombrero
  return (
    <g>
      <Eyes type={avatar.eyes} expression={expression} patch={eyeless} />
      {avatar.costume !== "oca" && <MouthShape type={avatar.mouth} expression={expression} />}
      {(expression === "euforico" || expression === "mareado") && (
        <g fill="#ff5c8a" opacity=".55">
          <ellipse cx="26" cy="62" rx="6" ry="3.5" />
          <ellipse cx="74" cy="62" rx="6" ry="3.5" />
        </g>
      )}
    </g>
  );
}

function Eyes({ type, expression, patch }: { type: AvatarConfig["eyes"]; expression: Expression; patch: boolean }) {
  const xs = type === "ciclope" ? [50] : patch ? [37] : [37, 63];
  if (expression === "mareado" || expression === "abducido") {
    return (
      <g fill="#fff" stroke={INK} strokeWidth="2.5">
        {xs.map((x) => (
          <g key={x}>
            <circle cx={x} cy="46" r="9" />
            <path d={`M${x} 46 m0 -1 a2 2 0 1 1 -2 2 a4 4 0 1 1 5 -4 a6 6 0 1 1 -8 6`} fill="none" />
          </g>
        ))}
      </g>
    );
  }
  if (expression === "euforico" || (expression === "feliz" && type === "dormilones")) {
    return (
      <g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round">
        {xs.map((x) => (
          <path key={x} d={`M${x - 7} 48 Q${x} 38 ${x + 7} 48`} />
        ))}
      </g>
    );
  }
  const r = type === "saltones" ? 12 : type === "ciclope" ? 14 : 9;
  const pupil = type === "saltones" ? 5 : type === "ciclope" ? 6 : 4.5;
  return (
    <g className="mc-eyes">
      {xs.map((x) => (
        <g key={x}>
          <circle cx={x} cy="46" r={r} fill="#fff" stroke={INK} strokeWidth="3" />
          <circle cx={x + 1} cy={expression === "triste" ? 49 : 47} r={pupil} fill={INK} />
          <circle cx={x + 3} cy="44" r="1.6" fill="#fff" />
          {type === "dormilones" && <path d={`M${x - r} 46 A${r} ${r} 0 0 1 ${x + r} 46 Z`} fill={INK} opacity=".85" />}
          {expression === "triste" && <path d={`M${x - 10} ${36} L${x + 8} ${40}`} stroke={INK} strokeWidth="3" strokeLinecap="round" />}
        </g>
      ))}
    </g>
  );
}

function MouthShape({ type, expression }: { type: AvatarConfig["mouth"]; expression: Expression }) {
  if (expression === "triste") return <path d="M40 74 Q50 66 60 74" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
  if (expression === "mareado") return <path d="M38 70 Q44 64 50 70 Q56 76 62 70" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
  if (expression === "euforico" || type === "dientes")
    return (
      <g>
        <path d="M36 64 Q50 84 64 64 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M40 65 L44 70 L48 65 L52 70 L56 65 L60 70 L62 65 Z" fill="#fff" />
        {expression === "euforico" && <ellipse cx="50" cy="76" rx="6" ry="3" fill="#ff5c8a" />}
      </g>
    );
  if (type === "lengua")
    return (
      <g>
        <path d="M38 64 Q50 76 62 64" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M46 68 Q50 82 56 68 Z" fill="#ff5c8a" stroke={INK} strokeWidth="2.5" />
      </g>
    );
  if (type === "sorpresa") return <ellipse cx="50" cy="69" rx="6" ry="7" fill={INK} />;
  return <path d="M38 64 Q50 78 62 64" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
}

function Stripes() {
  return (
    <g fill="#1b1f4b" opacity=".75">
      {[62, 76, 90].map((y) => (
        <rect key={y} x="0" y={y} width="100" height="6" />
      ))}
    </g>
  );
}

function PrisonerExtras() {
  return (
    <g stroke={INK} strokeWidth="3">
      <path d="M30 18 Q50 6 70 18 L68 24 Q50 16 32 24 Z" fill="#fff" />
      <path d="M38 13 L37 21 M50 10 L50 18 M62 13 L63 21" stroke={INK} strokeWidth="3" />
      <path d="M70 104 Q80 108 86 104" fill="none" strokeDasharray="3 2" />
      <circle cx="92" cy="104" r="7" fill="#333" />
    </g>
  );
}

function Sombrero() {
  return (
    <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <ellipse cx="50" cy="20" rx="42" ry="8" fill="#ff8a1f" />
      <path d="M32 20 Q34 0 50 -2 Q66 0 68 20 Z" fill="#ff8a1f" />
      <path d="M33 14 Q50 10 67 14" fill="none" stroke="#e8344a" strokeWidth="4" />
      <circle cx="40" cy="12" r="3" fill="#e53fd6" strokeWidth="1.5" />
      <circle cx="60" cy="12" r="3" fill="#ffc61a" strokeWidth="1.5" />
      <path d="M30 62 L36 60 M70 62 L64 60 M44 76 L44 80 M50 77 L50 81 M56 76 L56 80" strokeWidth="2.5" />
    </g>
  );
}

function WizardHat() {
  return (
    <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <path d="M56 -12 Q36 6 28 24 L74 24 Q66 6 56 -12 Z" fill="#2f4bd8" />
      <ellipse cx="51" cy="24" rx="28" ry="5" fill="#2f4bd8" />
      <path d="M44 6 l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5 Z" fill="#ffc61a" strokeWidth="1.2" />
      <path d="M60 14 l1.5 3 3 .4 -2 2 .6 3 -3 -1.5 -3 1.5 .6 -3 -2 -2 3 -.4 Z" fill="#ffc61a" strokeWidth="1" />
      <path d="M28 64 Q30 92 50 104 Q70 92 72 64 Q62 72 50 68 Q38 72 28 64 Z" fill="#ececf4" />
      <path d="M40 80 Q44 88 46 92 M54 92 Q56 88 60 80" fill="none" strokeWidth="2" />
    </g>
  );
}

function PirateHat() {
  return (
    <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <path d="M14 26 Q50 -10 86 26 Q50 14 14 26 Z" fill="#222" />
      <circle cx="50" cy="10" r="5" fill="#fff" strokeWidth="2" />
      <path d="M46 16 L54 16" strokeWidth="2" stroke="#fff" />
      <path d="M28 34 L78 52" strokeWidth="2.5" />
      <ellipse cx="63" cy="47" rx="10" ry="9" fill="#222" />
    </g>
  );
}

function Sunglasses() {
  return (
    <g stroke={INK} strokeWidth="3">
      <path d="M22 40 L78 40" />
      <rect x="25" y="38" width="22" height="13" rx="5" fill="#111" />
      <rect x="53" y="38" width="22" height="13" rx="5" fill="#111" />
      <path d="M29 41 L35 41" stroke="#fff" strokeWidth="2" />
    </g>
  );
}

/** Aclara (amount > 0) u oscurece (amount < 0) un color hex. */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
