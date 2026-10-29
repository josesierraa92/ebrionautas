"use client";

import { useEffect, useRef, useState } from "react";
import { LAST_TILE, type GameState } from "@/game/engine";
import { getTile, type Tile } from "@/game/board";
import { duelOutcome, jailOutcome, mazeOutcome, tileRule } from "@/game/rules";
import { DEFAULT_ICON, type IconName } from "@/editor/icons";
import { sfx } from "./sfx";
import { useCardTexts } from "./useCardTexts";

// Tiempos de las animaciones: tranquilos y fluidos (el usuario los vio "súper rápidos" con 450/140/450/1200 ms).
// IsoBoard usa los mismos para que la ficha llegue a cada casilla justo cuando empieza el siguiente paso.
const DICE_MS = 700; // el dado rueda
export const STEP_MS = 340; // la ficha camina de casilla en casilla
export const FLY_MS = 750; // vuelo de la Oca, agujero negro, resbalón…
const BANNER_MS = 1600;

export type Banner = { key: number; title: string; emoji: string; color: string; /** Icono de la casilla (vector) y su número; sin ellos, el emoji. */ icon?: IconName; n?: number };
/** `by`: quién tira (solo en los duelos, donde cada uno tira su dado). */
export type DiceFx = { key: number; value: number; rolling: boolean; by?: string };
/**
 * Casilla donde acaba de caer alguien (para la tarjeta que explica la regla). Se queda
 * hasta la siguiente tirada para que dé tiempo a leerla. `result`: lo que pasó al tirar
 * sin moverse (perdido en la niebla: se salvó o bebe; purgatorio: cuánto bebe para salir).
 */
export type Landed = { key: number; n: number; playerId: string; result?: { good: boolean; title: string; text: string; drinks?: number; icon?: string } };

/** Título grande y sonido según la casilla donde cae la ficha. */
const EVENTS: Partial<Record<Tile["type"], { title: string; emoji: string; color: string; sound: keyof typeof sfx }>> = {
  OCA: { title: "¡DE MURCIÉLAGO EN MURCIÉLAGO!", emoji: "🦇", color: "#ff9f1c", sound: "zap" },
  CARCEL: { title: "¡AL PURGATORIO!", emoji: "🔥", color: "#ff6b3d", sound: "jail" },
  MUERTE: { title: "¡A LA FOSA!", emoji: "⚰️", color: "#b07cff", sound: "blackhole" },
  PATINAZO: { title: "¡TROPIEZO!", emoji: "🪦", color: "#ff8a1f", sound: "slip" },
  LABERINTO: { title: "¡PERDIDO EN LA NIEBLA!", emoji: "🌫️", color: "#c9b8ff", sound: "spooky" },
  HIPNOSIS: { title: "¡POSEÍDO!", emoji: "👻", color: "#f15bb5", sound: "spooky" },
  POSADA: { title: "¡A LA CAPILLA!", emoji: "⛪", color: "#ffd166", sound: "land" },
  A_BEBER: { title: "¡RONDA DE MEZCAL!", emoji: "🥃", color: "#ffc61a", sound: "drink" },
  DUELO: { title: "¡DUELO!", emoji: "💀", color: "#ffffff", sound: "zap" },
  REGLA: { title: "¡NUEVA LEY!", emoji: "⚖️", color: "#b98bf0", sound: "gavel" },
  CULTURAL: { title: "¡LA OUIJA!", emoji: "🔮", color: "#ff6b7d", sound: "land" },
  ESCLAVO: { title: "¡PACTO DE SANGRE!", emoji: "🩸", color: "#ff4f6b", sound: "gavel" },
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
  useCardTexts(); // los títulos propios de las tarjetas deben estar cargados antes del primer título grande
  const [shown, setShown] = useState<Record<string, number>>({});
  const [flying, setFlying] = useState<string | null>(null);
  const [dice, setDice] = useState<DiceFx | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  // false mientras la ficha se mueve: la tarjeta grande de la TV espera a que termine.
  const [settled, setSettled] = useState(true);
  const [landed, setLanded] = useState<Landed | null>(null);
  // Ficha que sigue la cámara: la última que tiró, hasta que tire la siguiente.
  const [focus, setFocus] = useState<string | null>(null);
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
    // tirada de un duelo: cada uno tira su dado, no mueve a nadie ni cambia la tarjeta de la casilla
    const duelRoll = !!rolled && before.decision?.kind === "DUEL_ROLL";
    if (rolled) {
      const key = ++seq.current;
      const by = duelRoll ? game.players.find((p) => p.id === game.lastRoller)?.name : undefined;
      setDice({ key, value: game.lastRoll!, rolling: true, by });
      sfx.dice();
      later(DICE_MS, () => setDice((d) => (d?.key === key ? { key, value: game.lastRoll!, rolling: false, by } : d)));
      later(DICE_MS + 500, () => setDice((d) => (d?.key === key ? null : d)));
      t = DICE_MS + 100;
    }

    const mover = game.players.find((p) => p.pos !== startFrom[p.id]);
    if (rolled && !duelRoll) {
      // Nueva tirada: la tarjeta de la casilla anterior se va y llega la nueva.
      const roller = before.players[before.turn];
      const key = ++seq.current;
      const n = mover ? (stepPath(startFrom[mover.id], game.lastRoll!).at(-1) ?? mover.pos) : roller.pos;
      // Tirada sin moverse: perdido en la niebla (se salva o bebe) o salida del Purgatorio.
      const maze = roller.status.laberinto ? mazeOutcome(roller.name, game.lastRoll!) : null;
      const jail = roller.status.carcel ? jailOutcome(roller.name, game.lastRoll!) : null;
      const result = maze
        ? { good: maze.escaped, title: maze.title, text: maze.text }
        : jail
          ? { good: false, title: jail.title, text: jail.text, drinks: jail.drinks }
          : undefined;
      setLanded({ key, n, playerId: mover?.id ?? roller.id, result });
      setFocus(mover?.id ?? roller.id);
      if (result) {
        const bkey = ++seq.current;
        at(t, () => {
          setDice(null);
          setBanner(
            result.good
              ? { key: bkey, title: result.title, emoji: "✨", color: "#5cd23c" }
              : { key: bkey, title: result.title, emoji: jail ? "🔓" : "🍷", color: "#ffc61a" },
          );
          if (result.good) sfx.fly();
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
      if (rolled) at(t, () => showEvent(landed, mover.id)); // (un vuelo por decisión no repite el título)
      if (landing !== mover.pos) {
        t += path.length ? 400 : 0;
        at(t, () => {
          setFlying(mover.id);
          setShown((s) => ({ ...s, [mover.id]: mover.pos }));
          sfx.fly();
        });
        at(t + FLY_MS, () => setFlying(null));
        t += FLY_MS;
      }
    }

    // Duelo resuelto: tarjeta con los dados de cada rival y quién bebe.
    const duel = game.lastDuel && game.lastDuel.seq !== before.lastDuel?.seq ? duelOutcome(game) : null;
    if (duel) {
      const key = ++seq.current;
      setLanded({ key, n: game.players.find((p) => p.id === game.lastDuel!.by)!.pos, playerId: game.lastDuel!.by, result: { good: false, icon: "🔫", ...duel } });
      at(t, () => sfx.zap());
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
    at(t + (t > 0 ? 400 : 0), () => setSettled(true));

    function showEvent(tile: Tile, playerId: string) {
      const ev = EVENTS[tile.type];
      if (!ev) return sfx.land();
      const key = ++seq.current;
      setDice(null); // que el título no quede encima del dado
      // el título grande es el de la tarjeta de la casilla (si el admin lo cambia en el editor, cambia también aquí)
      const title = tileRule(tile.n, game!, playerId).title || ev.title;
      setBanner({ key, title, emoji: ev.emoji, color: ev.color, icon: DEFAULT_ICON[tile.type], n: tile.n });
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

  // La cámara sigue a quien se mueve; en cuanto termina la jugada (y el cuadro de arriba dice «Turno de X») pasa a X.
  const turnId = game && !game.winner ? game.players[game.turn]?.id : null;
  return { shown, flying, dice, banner, settled, landed, focus: settled && turnId ? turnId : focus };
}
