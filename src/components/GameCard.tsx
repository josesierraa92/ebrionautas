"use client";

// Tarjeta de regla del juego (TV y celular): panel oscuro con el color de la casilla como acento, el icono de la casilla
// en vector (nítido), «CASILLA N» y el título en letra de terror, el texto en la letra del juego y, si hay que decidir
// algo, una pastilla con lo que toca hacer en el celular. Todo se mide en `--u` (1cqw en la TV; 14px en el celular).
import { iconMaskUrl, type IconName } from "@/editor/icons";

export default function GameCard({
  accent,
  icon,
  emoji,
  kicker,
  title,
  text,
  prompt,
  unit,
  cardKey,
}: {
  accent: string;
  icon: IconName | null;
  emoji?: string;
  kicker: string;
  title: string;
  text: string;
  prompt?: string | null;
  unit: string;
  cardKey: number;
}) {
  const mask = icon ? iconMaskUrl(icon, 256) : null;
  const u = (k: number) => `calc(var(--u) * ${k})`;
  return (
    <div
      key={cardKey}
      className="card-pop relative w-full overflow-hidden text-left"
      style={{
        ["--u" as string]: unit,
        ["--accent" as string]: accent,
        borderRadius: u(1.4),
        border: `${u(0.22)} solid #0a071a`,
        background: "linear-gradient(165deg, #1d1642 0%, #100b2b 55%, #0a071a 100%)",
        boxShadow: `0 ${u(0.45)} 0 rgba(0,0,0,.5), 0 0 0 ${u(0.12)} ${accent}55`,
      }}
    >
      {/* filete de color arriba */}
      <div style={{ height: u(0.35), background: `linear-gradient(90deg, ${accent}, ${accent}88 70%, transparent)` }} />
      {/* icono enorme y muy tenue de fondo, para darle carácter */}
      {mask && (
        <div
          aria-hidden
          className="absolute"
          style={{ right: u(-1.6), bottom: u(-1.8), width: u(11), aspectRatio: "1", background: accent, opacity: 0.09, WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", transform: "rotate(-12deg)" }}
        />
      )}
      <div className="relative" style={{ padding: `${u(1.1)} ${u(1.4)} ${u(1.3)}`, display: "grid", gap: u(0.9) }}>
        {/* fila de arriba: icono y «CASILLA N · NOMBRE»; el título va debajo, a todo el ancho, en dos renglones como mucho */}
        <div className="flex items-center" style={{ gap: u(1.1) }}>
          {mask ? (
            <div className="shrink-0" style={{ width: u(3.6), filter: `drop-shadow(${u(0.14)} 0 0 #0a071a) drop-shadow(${u(-0.14)} 0 0 #0a071a) drop-shadow(0 ${u(0.14)} 0 #0a071a) drop-shadow(0 ${u(-0.14)} 0 #0a071a)` }}>
              <div style={{ aspectRatio: "1", background: accent, WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
            </div>
          ) : (
            <span className="shrink-0 leading-none" style={{ fontSize: u(3.2) }}>
              {emoji}
            </span>
          )}
          <p className="min-w-0 font-sans font-bold uppercase" style={{ fontSize: u(0.88), letterSpacing: "0.26em", color: accent }}>
            {kicker}
          </p>
        </div>
        <h3 className="banner-title leading-[1.05]" style={{ fontSize: u(titleSize(title)), textWrap: "balance", ["--accent" as string]: accent }}>
          {title}
        </h3>
        <p className="font-sans font-semibold whitespace-pre-line" style={{ fontSize: u(1.3), lineHeight: 1.35, color: "#efeaff" }}>
          {text}
        </p>
        {prompt && (
          <p className="text-center font-sans font-bold" style={{ fontSize: u(1.1), padding: `${u(0.45)} ${u(0.9)}`, borderRadius: u(9), background: `${accent}26`, border: `${u(0.14)} solid ${accent}`, color: "#fff" }}>
            📱 {prompt}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Tamaño del título (en `--u`) para que quepa en dos renglones: el ancho útil de la tarjeta es de unas 19 `--u` y la letra de terror
 * ocupa ~0,56 de su tamaño por carácter; los títulos cortos van al tamaño máximo.
 */
function titleSize(title: string) {
  const perLine = Math.ceil(title.length / 2) + 2;
  return Math.max(1.5, Math.min(2.6, 19 / (0.56 * perLine)));
}

