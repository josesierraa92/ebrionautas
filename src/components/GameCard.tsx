"use client";

// Tarjeta de regla del juego (TV, celular y vista previa del editor), con el diseño que dio el usuario: panel cuadrado del morado del
// cuadro de turno con las esquinas levemente redondeadas y borde grueso, la pastilla «CASILLA N» verde biche arriba en el centro, a la
// izquierda un cuadro redondeado verde con el icono de la casilla, el título en Lilita One (mayúsculas) con una flechita del color a la derecha, el texto
// en Nunito Sans y, si hay que decidir algo, un botón morado con un dado y lo que toca hacer en el celular.
// Todo se mide en `--u` (1cqw en la TV; unos 18px en el celular; 12px en el editor).
import BeerIcon from "@/components/BeerIcon";
import { iconMaskUrl, type IconName } from "@/editor/icons";

/** Verde biche con degradado a un verde más oscuro: el color de acento de todas las tarjetas (pastilla, cuadro del icono y flechita). */
const GREEN_LIGHT = "#b6ff3b";
const GREEN = `linear-gradient(160deg, ${GREEN_LIGHT}, #2fd11a)`;

export default function GameCard({
  icon,
  emoji,
  kicker,
  title,
  text,
  prompt,
  dice,
  unit,
  cardKey,
}: {
  /** Color de la casilla (ya no se usa: todas las tarjetas van en verde biche, pedido del usuario). */
  accent?: string;
  icon: IconName | null;
  emoji?: string;
  kicker: string;
  title: string;
  text: string;
  prompt?: string | null;
  /** Lo que sacó el dado: el dado del botón de «qué hacer en el celular» enseña ese número. */
  dice?: number | null;
  unit: string;
  cardKey: number;
}) {
  const mask = icon ? iconMaskUrl(icon, 256) : null;
  const u = (k: number) => `calc(var(--u) * ${k})`;
  const maskStyle = (url: string) => ({ WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" });
  return (
    <div key={cardKey} className="card-pop relative w-full text-left" style={{ ["--u" as string]: unit, paddingTop: u(0.9), filter: `drop-shadow(0 ${u(0.4)} ${u(0.6)} rgba(0,0,0,.55))` }}>
      {/* panel cuadrado con las esquinas levemente redondeadas, del mismo morado que el cuadro de turno, con borde grueso */}
      <div style={{ borderRadius: u(1.1), border: `${u(0.32)} solid #4a2a94`, background: "linear-gradient(180deg, #34187a 0%, #2d1460 50%, #220e4d 100%)", boxShadow: `0 0 0 ${u(0.12)} #1a0b38` }}>
        <div className="relative" style={{ padding: `${u(1.7)} ${u(1.5)} ${u(1.4)}` }}>
          {/* cabecera: hexágono con el icono y el título */}
          <div className="relative flex items-center" style={{ gap: u(1.1), paddingRight: u(1.4) }}>
            <div className="shrink-0" style={{ width: u(4), aspectRatio: "1", borderRadius: u(1), background: "#1a0b38", padding: u(0.2) }}>
              <div className="grid h-full w-full place-items-center" style={{ borderRadius: u(0.8), background: GREEN }}>
                {mask ? (
                  <div style={{ width: "98%", aspectRatio: "1", background: "#14260a", ...maskStyle(mask) }} />
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
            <span aria-hidden className="absolute right-0" style={{ top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: `${u(0.55)} solid transparent`, borderBottom: `${u(0.55)} solid transparent`, borderRight: `${u(0.7)} solid ${GREEN_LIGHT}` }} />
          </div>
          <p className="whitespace-pre-line" style={{ marginTop: u(1), fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700, fontSize: u(1.12), lineHeight: 1.4, letterSpacing: 0, color: "#d8d4f6" }}>
            {text}
          </p>
          {prompt && (
            <div className="flex items-center" style={{ marginTop: u(1.2), gap: u(0.9), padding: `${u(0.7)} ${u(1.1)}`, borderRadius: u(9), background: "linear-gradient(90deg, #5747e0, #7b55f2)", boxShadow: `inset 0 ${u(-0.18)} 0 rgba(0,0,0,.25), 0 0 0 ${u(0.12)} #2a2370` }}>
              <DiceIcon size={u(2.2)} value={dice} />
              <p className="font-display leading-tight text-white uppercase" style={{ fontSize: u(0.95), letterSpacing: "0.02em" }}>
                {prompt}
              </p>
            </div>
          )}
        </div>
      </div>
      {/* pastilla «CASILLA N» arriba en el centro, montada sobre el borde */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap font-display uppercase" style={{ padding: `${u(0.2)} ${u(1)}`, borderRadius: u(9), background: GREEN, color: "#14260a", fontSize: u(0.95), letterSpacing: "0.04em", boxShadow: `0 0 0 ${u(0.18)} #1a0b38` }}>
        <Kicker text={kicker} />
      </div>
    </div>
  );
}

/** Puntos de cada cara del dado en una cuadrícula de 3×3 (coordenadas 0..2). */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

/** Dado blanco del botón de «qué hacer en el celular»: enseña lo que sacó (sin dato, la cara del 5). */
function DiceIcon({ size, value }: { size: string; value?: number | null }) {
  const face = value && value >= 1 && value <= 6 ? value : 5;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#fff" />
      {PIPS[face].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={7.5 + cx * 4.5} cy={7.5 + cy * 4.5} r="1.9" fill="#2b2470" />
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

/** «Casilla 48 · Vane»: la palabra con el color de la pastilla y el número en blanco (con un filo oscuro para que se lea sobre el verde). */
function Kicker({ text }: { text: string }) {
  const m = /^(\D*?)(\d+)(.*)$/.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}
      <span style={{ color: "#fff", textShadow: "0 0 0.12em #14260a, 0 0.06em 0 #14260a, 0.06em 0 0 #14260a, -0.06em 0 0 #14260a, 0 -0.06em 0 #14260a" }}>{m[2]}</span>
      {m[3]}
    </>
  );
}

