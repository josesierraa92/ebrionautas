import BeerIcon from "@/components/BeerIcon";
import CardPanel, { GREEN_LIGHT } from "@/components/CardPanel";
import MaskIcon from "@/components/MaskIcon";
import { characterOf } from "@/game/characters";
import Marciano from "@/components/Marciano";
import { Cups } from "@/components/Winner";
import { avatarOf, expressionFor } from "@/game/avatar";
import { LAST_TILE, trophiesOf, type GameState } from "@/game/engine";

type Props = {
  game: GameState;
  /** Tamaño TV: letras y fichas más grandes. */
  big?: boolean;
  /** Si se pasa, muestra el botón +1 para penalizar a quien rompa la ley vigente. */
  onPenalty?: (id: string) => void;
  /** Si se pasa, la deuda de cada jugador es un botón para marcarla como bebida. */
  onDrank?: (id: string) => void;
};

const ROW = "rgba(255,255,255,.08)";
const body = { fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700 } as const;

/** Marcador con el diseño de las tarjetas: casilla, vasos bebidos, deudas y estados de cada jugador. Los nombres van muy grandes (se leen de noche y con copas). */
export default function PlayersList({ game, big = false, onPenalty, onDrank }: Props) {
  const current = game.players[game.turn]?.id;
  const u = (k: number) => `calc(var(--u) * ${k})`;
  const nameOf = (id: string) => game.players.find((q) => q.id === id)?.name;
  return (
    <CardPanel inline kicker="Marcador" unit={big ? "20px" : "17px"} width={big ? 34 : 30} maxH="none">
      {game.ronda && !game.winner && (
        <div className="flex items-start" style={{ gap: u(0.6), marginBottom: u(0.7), padding: u(0.7), borderRadius: u(0.9), background: "rgba(191,250,88,.16)", ...body, fontSize: u(1), color: "#d8d4f6" }}>
          <MaskIcon name="hourglass" color={GREEN_LIGHT} size={u(1.6)} />
          <span>
            <b style={{ color: GREEN_LIGHT }}>Ronda de {nameOf(game.ronda.by)}:</b> {game.ronda.text}
          </span>
        </div>
      )}
      <ul className="flex flex-col" style={{ gap: u(0.7) }}>
        {game.players.map((p) => {
          const isTurn = p.id === current && !game.winner;
          const chips: { icon: Parameters<typeof MaskIcon>[0]["name"]; text: string; color: string }[] = [];
          if (p.status.hipnosis) chips.push({ icon: "ghost", text: "Poseído", color: "#5be8d4" });
          if (p.status.carcel) chips.push({ icon: "flame", text: p.status.carcel.debt ? `Debe ${p.status.carcel.debt}` : "Purgatorio", color: "#ff6b3d" });
          if (game.slave?.slave === p.id) chips.push({ icon: "drop", text: `← ${nameOf(game.slave.master) ?? ""}`, color: "#ff4f6b" });
          if (game.slave?.master === p.id) chips.push({ icon: "drop", text: `→ ${nameOf(game.slave.slave) ?? ""}`, color: "#ff4f6b" });
          return (
            <li
              key={p.id}
              className={`flex items-center ${p.paused ? "opacity-50" : ""}`}
              style={{ gap: u(0.8), padding: u(0.7), borderRadius: u(1), background: ROW, boxShadow: isTurn ? `inset 0 0 0 ${u(0.24)} ${GREEN_LIGHT}` : undefined }}
            >
              <span className="relative shrink-0">
                <Marciano
                  avatar={avatarOf(p)}
                  expression={expressionFor(p, { winner: game.winner, isTurn })}
                  size={big ? 64 : 56}
                  character={characterOf(game.players, p.id)}
                />
                <Cups {...trophiesOf(game, p)} className={`absolute -top-1.5 -left-1.5 ${big ? "text-lg" : "text-sm"}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display uppercase leading-[1.02] text-white" style={{ fontSize: u(p.name.length <= 8 ? 1.9 : p.name.length <= 12 ? 1.6 : 1.35), letterSpacing: "0.01em", overflowWrap: "break-word" }}>
                  {p.name}
                  {p.gender && (
                    <span style={{ marginLeft: u(0.5), fontSize: u(1.2), color: p.gender === "hombre" ? "#7aa2ff" : "#ff7ac0" }}>{p.gender === "hombre" ? "♂" : "♀"}</span>
                  )}
                </p>
                <div className="flex items-center" style={{ gap: u(0.6), marginTop: u(0.5) }}>
                  <div className="flex-1 overflow-hidden rounded-full" style={{ height: u(0.7), background: "#1a0b38" }} title={`Casilla ${p.pos} de ${LAST_TILE}`}>
                    <div className="h-full rounded-full" style={{ width: `${(p.pos / LAST_TILE) * 100}%`, background: p.color }} />
                  </div>
                  <span className="shrink-0 font-display" style={{ fontSize: u(1.05), color: GREEN_LIGHT }}>
                    {p.pos}/{LAST_TILE}
                  </span>
                  <span className="inline-flex shrink-0 items-center font-display text-white" style={{ gap: u(0.3), padding: `${u(0.1)} ${u(0.7)}`, borderRadius: 999, background: "#1a0b38", fontSize: u(1.5) }} title="Total bebido">
                    <BeerIcon /> {p.drunk}
                  </span>
                </div>
                {(chips.length > 0 || p.paused) && (
                  <div className="flex flex-wrap" style={{ gap: u(0.4), marginTop: u(0.5) }}>
                    {p.paused && (
                      <span className="font-display uppercase" style={{ padding: `${u(0.1)} ${u(0.6)}`, borderRadius: 999, background: "rgba(255,255,255,.14)", fontSize: u(0.85), color: "#d8d4f6" }}>
                        En pausa
                      </span>
                    )}
                    {chips.map((c, i) => (
                      <span key={i} className="inline-flex items-center font-display uppercase" style={{ gap: u(0.3), padding: `${u(0.1)} ${u(0.6)}`, borderRadius: 999, background: "rgba(0,0,0,.3)", fontSize: u(0.85), color: c.color }}>
                        <MaskIcon name={c.icon} color={c.color} size={u(1)} />
                        {c.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end" style={{ gap: u(0.4) }}>
                {p.pending > 0 &&
                  (onDrank ? (
                    <button title="Marcar como bebido" onClick={() => onDrank(p.id)} className="btn-game animate-pulse bg-btn-red px-2 py-0.5 text-white" style={{ fontSize: u(0.95) }}>
                      DEBE {p.pending} ✓
                    </button>
                  ) : (
                    <span className="animate-pulse rounded-full bg-btn-red px-2 font-display text-white" style={{ fontSize: u(0.95) }}>
                      DEBE {p.pending}
                    </span>
                  ))}
                {onPenalty && game.rule && !game.winner && (
                  <button title="Rompió la ley: bebe" aria-label={`${p.name} rompió la ley`} onClick={() => onPenalty(p.id)} className="btn-game bg-btn-special px-2 text-white" style={{ fontSize: u(0.95) }}>
                    +1
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </CardPanel>
  );
}
