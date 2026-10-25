import IsoBoard from "@/components/IsoBoard";
import { defaultAvatar } from "@/game/avatar";
import { createGame } from "@/game/engine";
import { PLAYER_COLORS } from "@/game/tileStyle";

// Prototipo del tablero isométrico con jugadores de ejemplo.
const game = createGame(
  ["Ana", "Beto", "Caro", "Dani"].map((name, i) => ({ name, color: PLAYER_COLORS[i], avatar: defaultAvatar(i, PLAYER_COLORS[i]) })),
);
game.players[0].pos = 1;
game.players[1].pos = 1;
game.players[2].pos = 19;
game.players[3].pos = 37;

export default function MuestraIso() {
  return (
    <main className="board-space h-dvh p-4">
      <IsoBoard players={game.players} current="p3" />
    </main>
  );
}
