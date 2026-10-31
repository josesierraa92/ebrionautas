import Marciano from "@/components/Marciano";
import { avatarOf } from "@/game/avatar";
import { characterOf } from "@/game/characters";
import TrophyIcon, { type TrophyId } from "@/components/TrophyIcon";
import type { Player } from "@/game/engine";

/**
 * Premios de un jugador junto a su retrato: la copa (ganó la partida entera) y una estrella por ronda ganada. `cup` = colores y contorno
 * de los dibujos, `starIcon`/`trophyIcon` = cuál se dibuja (elegible en el editor).
 */
export function Cups({
  stars = 0,
  trophy = false,
  className = "",
  size = "1.3em",
  gap = -13,
  starIcon = "estrellaGordaRedonda",
  trophyIcon = "copa",
  cup,
  glow,
  style,
}: {
  stars?: number;
  trophy?: boolean;
  className?: string;
  style?: React.CSSProperties;
  size?: string;
  /** espacio entre ellos en % de su tamaño (negativo = encimados) */
  gap?: number;
  starIcon?: TrophyId;
  trophyIcon?: TrophyId;
  cup?: { fill: string; outline: string; stroke: number };
  glow?: { color: string; strength: number; reach: number };
}) {
  const items: TrophyId[] = [...(trophy ? [trophyIcon] : []), ...Array.from({ length: Math.min(stars, 3) }, () => starIcon)];
  if (items.length === 0) return null;
  const label = `${trophy ? "ganó la partida" : ""}${trophy && stars ? " y " : ""}${stars ? `${stars} ${stars === 1 ? "ronda ganada" : "rondas ganadas"}` : ""}`;
  return (
    <span className={`inline-flex ${className}`} style={style} title={label} aria-label={label}>
      {items.map((icon, i) => (
        <TrophyIcon key={i} size={size} {...cup} glow={glow} icon={icon} className="drop-shadow-[0_1px_1px_rgba(0,0,0,.5)]" style={i ? { marginLeft: `calc(${size} * ${gap / 100})` } : undefined} />
      ))}
    </span>
  );
}

export default function Winner({ winner, players, goal = 1, children }: { winner: Player; players?: Player[]; goal?: number; children?: React.ReactNode }) {
  const roundOnly = goal > 1 && (winner.cups ?? 0) < goal; // le faltan copas: solo ganó la ronda
  return (
    <div className="flex flex-col gap-3 text-center">
      <div className="flex items-end justify-center gap-2">
        <TrophyIcon size={56} />
        <Marciano avatar={avatarOf(winner)} expression="euforico" size={110} character={players ? characterOf(players, winner.id) : undefined} />
        <span className="text-5xl">🪦</span>
      </div>
      <h2 className="title-game text-4xl">¡{winner.name.toUpperCase()} GANA{roundOnly ? " LA RONDA" : ""}!</h2>
      {roundOnly ? (
        <p>
          Se lleva una estrella <Cups stars={1} />: {winner.cups} de {goal}. Hay otra ronda con los mismos jugadores.
        </p>
      ) : (
        <p>Volvió a su tumba antes del amanecer (borracho, pero a tiempo). Que reparta el resto de bebida como quiera.</p>
      )}
      {children}
    </div>
  );
}
