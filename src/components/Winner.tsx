import Marciano from "@/components/Marciano";
import { avatarOf } from "@/game/avatar";
import type { Player } from "@/game/engine";

export default function Winner({ winner, children }: { winner: Player; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 text-center">
      <div className="flex items-end justify-center gap-2">
        <span className="text-5xl">🏆</span>
        <Marciano avatar={avatarOf(winner)} expression="euforico" size={110} />
        <span className="text-5xl">🌍</span>
      </div>
      <h2 className="title-game text-4xl">¡{winner.name.toUpperCase()} GANA!</h2>
      <p>Llegó a la Tierra. Que reparta el resto de bebida como quiera.</p>
      {children}
    </div>
  );
}
