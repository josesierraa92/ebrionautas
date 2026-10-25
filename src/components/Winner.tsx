import type { Player } from "@/game/engine";

export default function Winner({ winner, children }: { winner: Player; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 text-center">
      <div className="text-6xl">🏆🌍</div>
      <h2 className="title-game text-4xl">¡{winner.name.toUpperCase()} GANA!</h2>
      <p>Llegó a la Tierra. Que reparta el resto de bebida como quiera.</p>
      {children}
    </div>
  );
}
