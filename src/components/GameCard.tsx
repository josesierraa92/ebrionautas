"use client";

// Tarjeta de regla del juego (TV, celular y vista previa del editor), con el diseño que dio el usuario: panel azul morado oscuro con
// las esquinas cortadas y un filete claro, la pastilla «CASILLA N» del color de la casilla arriba en el centro, a la izquierda un
// hexágono del color de la casilla con su icono, el título en Lilita One (mayúsculas) con una flechita del color a la derecha, el texto
// en Nunito Sans y, si hay que decidir algo, un botón morado con un dado y lo que toca hacer en el celular.
// Todo se mide en `--u` (1cqw en la TV; unos 18px en el celular; 12px en el editor).
import BeerIcon from "@/components/BeerIcon";
import { iconMaskUrl, type IconName } from "@/editor/icons";

/** Polígono con las cuatro esquinas cortadas en diagonal (`c` = tamaño del corte). */
const chamfer = (c: string) => `polygon(${c} 0, calc(100% - ${c}) 0, 100% ${c}, 100% calc(100% - ${c}), calc(100% - ${c}) 100%, ${c} 100%, 0 calc(100% - ${c}), 0 ${c})`;
const HEX = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

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
  const maskStyle = (url: string) => ({ WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" });
  return (
    <div key={cardKey} className="card-pop relative w-full text-left" style={{ ["--u" as string]: unit, paddingTop: u(0.9), filter: `drop-shadow(0 ${u(0.4)} ${u(0.6)} rgba(0,0,0,.55))` }}>
      {/* borde: capa clara de fuera y panel por dentro, los dos con las esquinas cortadas */}
      <div style={{ clipPath: chamfer(u(1.3)), background: "linear-gradient(180deg, #4b43a8, #2c2770)", padding: u(0.16) }}>
        <div className="relative" style={{ clipPath: chamfer(u(1.22)), background: "linear-gradient(180deg, #27235f 0%, #1c1949 55%, #16133b 100%)", padding: `${u(1.7)} ${u(1.5)} ${u(1.4)}` }}>
          {/* cabecera: hexágono con el icono y el título */}
          <div className="relative flex items-center" style={{ gap: u(1.1), paddingRight: u(1.4) }}>
            <div className="shrink-0" style={{ width: u(4.2), aspectRatio: "0.88", clipPath: HEX, background: "#120f30", padding: u(0.22) }}>
              <div className="grid h-full w-full place-items-center" style={{ clipPath: HEX, background: `linear-gradient(160deg, ${accent}, color-mix(in srgb, ${accent} 70%, #000))` }}>
                {mask ? (
                  <div style={{ width: "58%", aspectRatio: "1", background: "#1d1640", ...maskStyle(mask) }} />
                ) : (
                  <span className="leading-none" style={{ fontSize: u(2.2) }}>
                    {emoji === "🍷" ? <BeerIcon size="1em" /> : emoji}
                  </span>
                )}
              </div>
            </div>
            <h3 className="min-w-0 font-display leading-[1.02] text-white uppercase" style={{ fontSize: u(titleSize(title)), textWrap: "balance", letterSpacing: "0.01em" }}>
              {title}
            </h3>
            {/* flechita del color de la casilla a la derecha */}
            <span aria-hidden className="absolute right-0" style={{ top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: `${u(0.55)} solid transparent`, borderBottom: `${u(0.55)} solid transparent`, borderRight: `${u(0.7)} solid ${accent}` }} />
          </div>
          <p className="whitespace-pre-line" style={{ marginTop: u(1), fontFamily: "var(--font-nunito), sans-serif", fontWeight: 600, fontSize: u(1.12), lineHeight: 1.4, letterSpacing: 0, color: "#d8d4f6" }}>
            {text}
          </p>
          {prompt && (
            <div className="flex items-center" style={{ marginTop: u(1.2), gap: u(0.9), padding: `${u(0.7)} ${u(1.1)}`, borderRadius: u(9), background: "linear-gradient(90deg, #5747e0, #7b55f2)", boxShadow: `inset 0 ${u(-0.18)} 0 rgba(0,0,0,.25), 0 0 0 ${u(0.12)} #2a2370` }}>
              <DiceIcon size={u(2)} />
              <p className="font-display leading-tight text-white uppercase" style={{ fontSize: u(0.95), letterSpacing: "0.02em" }}>
                {prompt}
              </p>
            </div>
          )}
        </div>
      </div>
      {/* pastilla «CASILLA N» arriba en el centro, montada sobre el borde */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap font-display uppercase" style={{ padding: `${u(0.2)} ${u(1)}`, borderRadius: u(9), background: accent, color: "#1d1640", fontSize: u(0.95), letterSpacing: "0.04em", boxShadow: `0 0 0 ${u(0.16)} #16133b` }}>
        {kicker}
      </div>
    </div>
  );
}

/** Dado blanco del botón de «qué hacer en el celular». */
function DiceIcon({ size }: { size: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#fff" />
      {[
        [7.5, 7.5],
        [16.5, 7.5],
        [12, 12],
        [7.5, 16.5],
        [16.5, 16.5],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.9" fill="#2b2470" />
      ))}
    </svg>
  );
}

/**
 * Tamaño del título (en `--u`) para que quepa en dos renglones al lado del hexágono: el ancho útil es de unas 11 `--u` y en Lilita One
 * en mayúsculas cada letra ocupa ~0,6 de su tamaño; los títulos cortos van al tamaño máximo.
 */
function titleSize(title: string) {
  const perLine = Math.ceil(title.length / 2) + 1;
  return Math.max(1.2, Math.min(2.2, 11 / (0.6 * perLine)));
}
