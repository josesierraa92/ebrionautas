"use client";

import Board3D from "@/components/Board3D";
import { defaultAvatar } from "@/game/avatar";
import { createGame } from "@/game/engine";
import { PLAYER_COLORS } from "@/game/tileStyle";

// Prototipo del tablero 3D con jugadores de ejemplo.
const game = createGame(
  ["Ana", "Beto", "Caro", "Dani"].map((name, i) => ({ name, color: PLAYER_COLORS[i], avatar: defaultAvatar(i, PLAYER_COLORS[i]) })),
);
game.players[0].pos = 1;
game.players[1].pos = 1;
game.players[2].pos = 9;
game.players[3].pos = 23;

export default function Muestra3D() {
  return (
    <main className="h-dvh w-full">
      <Board3D players={game.players} current="p3" />
    </main>
  );
}
