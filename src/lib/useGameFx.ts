"use client";

import { useEffect, useRef, useState } from "react";
import { LAST_TILE, type GameState } from "@/game/engine";
import { getTile, type Tile } from "@/game/board";
import { mazeOutcome } from "@/game/rules";
import { sfx } from "./sfx";

const DICE_MS = 750; // el dado rueda
const STEP_MS = 230; // la ficha salta de casilla en casilla
const FLY_MS = 650; // vuelo de la Oca, agujero negro, resbalón…
const BANNER_MS = 1800;

export type Banner = { key: number; title: string; emoji: string; color: string };
export type DiceFx = { key: number; value: number; rolling: boolean };
/**
 * Casilla donde acaba de caer alguien (para la tarjeta que explica la regla). Se queda
 * hasta la siguiente tirada para que dé tiempo a leerla. `result`: lo que pasó al tirar
 * sin moverse (p. ej. perdido en los asteroides: se salvó o bebe).
 */
export type Landed = { key: number; n: number; playerId: string; result?: { good: boolean; title: string; text: string } };

/** Título grande y sonido según la casilla donde cae la ficha. */
const EVENTS: Partial<Record<Tile["type"], { title: string; emoji: string; color: string; sound: keyof typeof sfx }>> = {
  OCA: { title: "¡DE OVNI EN OVNI!", emoji: "🛸", color: "#7fd3ff", sound: "zap" },
  CARCEL: { title: "¡AL CALABOZO!", emoji: "🚔", color: "#8a99b0", sound: "jail" },
  MUERTE: { title: "¡AGUJERO NEGRO!", emoji: "🕳️", color: "#9b5de5", sound: "blackhole" },
  PATINAZO: { title: "¡RESBALÓN!", emoji: "🪐", color: "#ff8a1f", sound: "slip" },
  LABERINTO: { title: "¡PERDIDO EN LOS ASTEROIDES!", emoji: "☄️", color: "#5fd07a", sound: "spooky" },
  HIPNOSIS: { title: "¡ABDUCIDO!", emoji: "🌀", color: "#f15bb5", sound: "spooky" },
  POSADA: { title: "¡GASOLINERA ABSTEMIA!", emoji: "⛽", color: "#c08a52", sound: "land" },
  A_BEBER: { title: "¡A BEBER!", emoji: "🍷", color: "#ffc61a", sound: "drink" },
  DUELO: { title: "¡DUELO!", emoji: "🔫", color: "#ffffff", sound: "zap" },
  REGLA: { title: "¡NUEVA LEY!", emoji: "⚖️", color: "#b98bf0", sound: "gavel" },
  CULTURAL: { title: "¡EXAMEN DE HUMANOLOGÍA!", emoji: "❓", color: "#ff6b7d", sound: "land" },
  ESCLAVO: { title: "¡ESCLAVOS!", emoji: "⛓️", color: "#d0d0d8", sound: "gavel" },
};

/** Casillas por las que pasa la ficha al tirar `roll` desde `from` (rebota si se pasa de la 62). */
export function stepPath(from: number, roll: number): number[] {
  const path: number[] = [];
  let pos = from;
  let dir = 1;
  for (let i = 0; i < roll; i++) {
    if (pos === LAST_TILE) dir = -1;
    pos += dir;
    path.push(pos);
  }
  return path;
}

/**
 * Efectos de la TV: posiciones mostradas (las fichas avanzan casilla a casilla
 * aunque el servidor ya tenga la posición final), el dado rodando, los títulos
 * grandes de cada casilla y los sonidos.
 */
export function useGameFx(game: GameState | null) {
  const [shown, setShown] = useState<Record<string, number>>({});
  const [flying, setFlying] = useState<string | null>(null);
  const [dice, setDice] = useState<DiceFx | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  // false mientras la ficha se mueve: la tarjeta grande de la TV espera a que termine.
  const [settled, setSettled] = useState(true);
  const [landed, setLanded] = useState<Landed | null>(null);
  const prev = useRef<GameState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Los que esconden el dado y los títulos no se cancelan con una jugada nueva: si no, se quedarían pegados.
  const hideTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    const before = prev.current;
    prev.current = game;
    if (!game) return;
    const target = Object.fromEntries(game.players.map((p) => [p.id, p.pos]));

    // Primera carga, o una partida distinta: sin animación.
    if (!before || before.players.length !== game.players.length || game.rollSeq < (before.rollSeq ?? 0)) {
      setShown(target);
      return;
    }

    // Si llega otra jugada a mitad de una animación, se termina de golpe.
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    const later = (ms: number, fn: () => void) => hideTimers.current.push(setTimeout(fn, ms));
    const startFrom = Object.fromEntries(before.players.map((p) => [p.id, p.pos]));
    setShown(startFrom);
    setFlying(null);

    setSettled(false);
    let t = 0;
    const rolled = (game.rollSeq ?? 0) > (before.rollSeq ?? 0) && game.lastRoll;
    if (rolled) {
      const key = ++seq.current;
      setDice({ key, value: game.lastRoll!, rolling: true });
      sfx.dice();
      later(DICE_MS, () => setDice((d) => (d?.key === key ? { key, value: game.lastRoll!, rolling: false } : d)));
      later(DICE_MS + 900, () => setDice((d) => (d?.key === key ? null : d)));
      t = DICE_MS + 150;
    }

    const mover = game.players.find((p) => p.pos !== startFrom[p.id]);
    if (rolled) {
      // Nueva tirada: la tarjeta de la casilla anterior se va y llega la nueva.
      const roller = before.players[before.turn];
      const key = ++seq.current;
      const n = mover ? (stepPath(startFrom[mover.id], game.lastRoll!).at(-1) ?? mover.pos) : roller.pos;
      const maze = roller.status.laberinto ? mazeOutcome(roller.name, game.lastRoll!) : null;
      const result = maze ? { good: maze.escaped, title: maze.title, text: maze.text } : undefined;
      setLanded({ key, n, playerId: mover?.id ?? roller.id, result });
      if (maze) {
        const bkey = ++seq.current;
        at(t, () => {
          setDice(null);
          setBanner(maze.escaped ? { key: bkey, title: "¡SE SALVÓ!", emoji: "✨", color: "#5cd23c" } : { key: bkey, title: "¡A BEBER!", emoji: "🍷", color: "#ffc61a" });
          if (maze.escaped) sfx.fly();
          else sfx.drink();
        });
        later(t + BANNER_MS, () => setBanner((b) => (b?.key === bkey ? null : b)));
      }
    }
    if (mover) {
      const from = startFrom[mover.id];
      const path = rolled ? stepPath(from, game.lastRoll!) : [];
      // Si el dado no explica la posición final, el último tramo es un vuelo.
      const landing = path.at(-1) ?? from;
      path.forEach((pos, i) =>
        at(t + i * STEP_MS, () => {
          setShown((s) => ({ ...s, [mover.id]: pos }));
          sfx.step();
        }),
      );
      t += path.length * STEP_MS;
      const landed = getTile(landing);
      at(t, () => showEvent(landed));
      if (landing !== mover.pos) {
        t += path.length ? 700 : 0;
        at(t, () => {
          setFlying(mover.id);
          setShown((s) => ({ ...s, [mover.id]: mover.pos }));
          sfx.fly();
        });
        at(t + FLY_MS, () => setFlying(null));
        t += FLY_MS;
      }
    }

    // Alguien bebió: "glu-glu".
    const drankMore = game.players.some((p) => p.drunk > (before.players.find((q) => q.id === p.id)?.drunk ?? 0));
    if (drankMore) at(t + 150, () => sfx.drink());

    if (game.winner && !before.winner) {
      const key = ++seq.current;
      at(t + 200, () => {
        const w = game.players.find((p) => p.id === game.winner)!;
        setBanner({ key, title: `¡${w.name.toUpperCase()} GANA!`, emoji: "🏆", color: "#ffc61a" });
        sfx.win();
      });
      later(t + 200 + BANNER_MS * 2, () => setBanner((b) => (b?.key === key ? null : b)));
    }

    at(t, () => setShown(target));
    // Margen para que se lea el título de la casilla antes de la tarjeta.
    at(t + (t > 0 ? 900 : 0), () => setSettled(true));

    function showEvent(tile: Tile) {
      const ev = EVENTS[tile.type];
      if (!ev) return sfx.land();
      const key = ++seq.current;
      setDice(null); // que el título no quede encima del dado
      setBanner({ key, title: ev.title, emoji: ev.emoji, color: ev.color });
      sfx[ev.sound]();
      later(BANNER_MS, () => setBanner((b) => (b?.key === key ? null : b)));
    }
  }, [game]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      hideTimers.current.forEach(clearTimeout);
    },
    [],
  );

  return { shown, flying, dice, banner, settled, landed };
}
