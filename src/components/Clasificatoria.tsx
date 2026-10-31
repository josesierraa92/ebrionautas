"use client";

// Clasificatoria de fin de partida (celular): un cuadro grande en el centro de la pantalla, con el mismo diseño que las tarjetas de las
// casillas (panel morado con borde grueso, pastilla y cuadros verde biche), con todos los jugadores y cuántos tragos se tomó cada uno.
import BeerIcon from "@/components/BeerIcon";
import Marciano from "@/components/Marciano";
import TrophyIcon from "@/components/TrophyIcon";
import { Cups } from "@/components/Winner";
import { avatarOf } from "@/game/avatar";
import { characterOf } from "@/game/characters";
import { trophiesOf, type GameState } from "@/game/engine";

const GREEN_LIGHT = "#bffa58";
const GREEN = `linear-gradient(160deg, ${GREEN_LIGHT}, #5fc34a)`;

/** Jugadores de más a menos tragos (a igualdad, primero el ganador y luego por nombre). */
export function standings(game: GameState) {
  return [...game.players].sort((a, b) => b.drunk - a.drunk || Number(b.id === game.winner) - Number(a.id === game.winner) || a.name.localeCompare(b.name));
}

/** `onClose` vacío = solo se mira (la TV: la cierra el celular). */
export default function Clasificatoria({ game, onClose, unit = "17px" }: { game: GameState; onClose?: () => void; unit?: string }) {
  const rows = standings(game);
  const max = Math.max(1, ...rows.map((p) => p.drunk));
  const total = rows.reduce((a, p) => a + p.drunk, 0);
  const u = (k: number) => `calc(var(--u) * ${k})`;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#090620]/95 px-4 py-6" role="dialog" aria-modal="true" aria-label="Clasificatoria" onClick={onClose}>
      <div className="card-pop relative w-full" style={{ ["--u" as string]: unit, maxWidth: "calc(var(--u) * 26)", paddingTop: u(0.9), filter: `drop-shadow(0 ${u(0.4)} ${u(0.6)} rgba(0,0,0,.55))` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ borderRadius: u(1.1), border: `${u(0.32)} solid #452b8e`, background: "linear-gradient(180deg, #2f1768 0%, #29155a 50%, #210f4d 100%)" }}>
          <div className="flex max-h-[85dvh] flex-col" style={{ padding: `${u(1.9)} ${u(1.3)} ${u(1.3)}`, gap: u(0.9) }}>
            <div className="text-center">
              <h3 className="font-display leading-none text-white uppercase" style={{ fontSize: u(2.1), letterSpacing: "0.01em" }}>
                Clasificatoria
              </h3>
              <p style={{ marginTop: u(0.4), fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700, fontSize: u(0.95), color: "#d8d4f6" }}>
                Tragos de cada uno · {total} en total
              </p>
            </div>

            <ol className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ gap: u(0.6) }}>
              {rows.map((p, i) => {
                const won = p.id === game.winner;
                return (
                  <li
                    key={p.id}
                    className="relative flex items-center"
                    style={{ gap: u(0.8), padding: `${u(0.5)} ${u(0.8)} ${u(0.5)} ${u(0.5)}`, borderRadius: u(0.9), background: won ? "rgba(191,250,88,.16)" : "rgba(255,255,255,.07)", boxShadow: won ? `inset 0 0 0 ${u(0.15)} ${GREEN_LIGHT}` : undefined }}
                  >
                    {/* posición en un cuadro verde, como el del icono de las tarjetas */}
                    <span className="grid shrink-0 place-items-center font-display" style={{ width: u(2.4), height: u(2.4), borderRadius: u(0.7), background: GREEN, color: "#14260a", fontSize: u(1.3) }}>
                      {i + 1}
                    </span>
                    <Marciano avatar={avatarOf(p)} size={36} character={characterOf(game.players, p.id)} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display leading-none text-white uppercase" style={{ fontSize: u(1.25) }}>
                        {p.name}
                        {won && <TrophyIcon size={u(1.3)} className="ml-1" />}
                        {(game.cupsGoal ?? 1) > 1 && <Cups {...trophiesOf(game, p)} className="ml-1" />}
                      </p>
                      {/* barrita proporcional a lo que bebió */}
                      <div className="overflow-hidden" style={{ marginTop: u(0.45), height: u(0.45), borderRadius: u(0.3), background: "rgba(0,0,0,.35)" }}>
                        <div style={{ width: `${(p.drunk / max) * 100}%`, height: "100%", borderRadius: u(0.3), background: p.color }} />
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center font-display text-white" style={{ gap: u(0.3), fontSize: u(1.6) }}>
                      <BeerIcon size={u(1.5)} />
                      {p.drunk}
                    </span>
                  </li>
                );
              })}
            </ol>

            {onClose && (
              <button onClick={onClose} className="btn-game bg-btn-green py-3 text-xl text-white">
                CERRAR
              </button>
            )}
          </div>
        </div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap font-display uppercase" style={{ padding: `${u(0.2)} ${u(1)}`, borderRadius: u(9), background: GREEN, color: "#14260a", fontSize: u(0.95), letterSpacing: "0.04em" }}>
          ¡Terminó la partida!
        </div>
      </div>
    </div>
  );
}
