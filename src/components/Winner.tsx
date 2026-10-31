import Marciano from "@/components/Marciano";
import { avatarOf } from "@/game/avatar";
import { characterOf } from "@/game/characters";
import TrophyIcon from "@/components/TrophyIcon";
import type { Player } from "@/game/engine";

/** Copitas amarillas de un jugador (una por ronda ganada). */
export function Cups({ n, className = "" }: { n?: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={`inline-flex ${className}`} title={`${n} ${n === 1 ? "copa" : "copas"}`} aria-label={`${n} ${n === 1 ? "copa" : "copas"}`}>
      {Array.from({ length: Math.min(n, 3) }, (_, i) => (
        <TrophyIcon key={i} size="1.3em" className="-ml-1 first:ml-0 drop-shadow-[0_1px_1px_rgba(0,0,0,.5)]" />
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
          Se lleva una copa <Cups n={winner.cups} />: {winner.cups} de {goal}. Hay otra ronda con los mismos jugadores.
        </p>
      ) : (
        <p>Volvió a su tumba antes del amanecer (borracho, pero a tiempo). Que reparta el resto de bebida como quiera.</p>
      )}
      {children}
    </div>
  );
}
