// Explicación de cada casilla para la tarjeta grande de la TV: qué es y cuál es la regla.

import { getTile } from "./board";
import { RESULT_KEYS, cardKeyOf, cardText } from "./cards";
import { createGame, jailBail, type GameState } from "./engine";

const vasos = (n: number) => `${n} ${n === 1 ? "vaso" : "vasos"}`;

/** Resultado de tirar estando en el Purgatorio: debe 2 (1-3) o 4 (4-6) y elige cuántos paga ya. */
export function jailOutcome(name: string, roll: number): { drinks: number; title: string; text: string } {
  const drinks = jailBail(roll);
  return { drinks, ...cardText(RESULT_KEYS.jailRoll, { nombre: name, dado: roll, vasos: vasos(drinks) }) };
}

/** Tarjeta mientras se decide cuánto paga en el Purgatorio (tras tirar, o en un turno de pagar deuda). */
export function jailPayCard(game: GameState): { good: false; title: string; text: string; drinks: number; tileIcon: true } | null {
  const d = game.decision;
  if (d?.kind !== "JAIL_PAY") return null;
  const name = game.players[game.turn]?.name ?? "";
  const t = d.roll !== null ? jailOutcome(name, d.roll) : cardText(RESULT_KEYS.jailDebt, { nombre: name, vasos: vasos(d.owed) });
  return { good: false, title: t.title, text: t.text, drinks: d.owed, tileIcon: true };
}

/** Lo que pasó al pagar en el Purgatorio: sale (pagó todo) o queda debiendo. */
export function jailPaidOutcome(game: GameState): { free: boolean; title: string; text: string } | null {
  const j = game.lastJail;
  if (!j) return null;
  const name = game.players.find((p) => p.id === j.by)?.name ?? "";
  const free = j.left === 0;
  const t = free
    ? cardText(RESULT_KEYS.jail, { nombre: name, pagados: vasos(j.paid), vasos: vasos(j.paid), dado: game.lastRoll ?? "" })
    : cardText(RESULT_KEYS.jailOwes, { nombre: name, pagados: vasos(j.paid), deuda: vasos(j.left) });
  return { free, ...t };
}

/** Resultado de un duelo, una línea por rival: quién sacó cuánto y quién bebe. */
export function duelOutcome(game: GameState): { title: string; text: string } | null {
  const d = game.lastDuel;
  if (!d) return null;
  const name = (id: string) => game.players.find((q) => q.id === id)?.name ?? "?";
  const lines = d.rounds.map((r) => `${name(d.by)} ${r.a} – ${name(r.rival)} ${r.b}: bebe ${name(r.loser)}.`);
  return cardText(RESULT_KEYS.duel, { resultado: lines.join("\n") });
}

/** Los datos con que se rellenan los huecos de la tarjeta de la casilla `n` para el jugador `playerId`. */
export function tileVars(n: number, game: GameState, playerId: string): Record<string, string | number> {
  const tile = getTile(n);
  const p = game.players.find((q) => q.id === playerId);
  const nombre = p?.name ?? "El jugador";
  switch (tile.type) {
    case "A_BEBER":
      return { nombre, vasos: vasos(Math.min(3, game.giftAmount ?? tile.amount)) };
    case "DUELO": {
      // como máximo los rivales que hay en la mesa (el motor hace lo mismo): con 2 jugadores solo se puede retar a 1
      const max = Math.max(1, Math.min(tile.amount, game.players.length - 1));
      return { nombre, rivales: `${max} ${max === 1 ? "rival" : "rivales"}` };
    }
    case "OCA":
      // `destino` ya no está en el texto de serie, pero un texto propio guardado antes lo puede usar
      return { nombre, casilla: tile.next ?? "", destino: tile.next ? `volar hasta la casilla ${tile.next} y volver a tirar` : "volver a tirar" };
    case "PATINAZO":
      return { nombre, vasos: vasos(tile.drinks), casilla: tile.backTo };
    case "RASGO":
      return { nombre, frase: game.juicio ?? "…" };
    case "CULTURAL":
      return { nombre, categoria: game.category ?? "…" };
    case "YO_NUNCA":
      return { nombre, frase: game.nunca ?? "…" };
    case "RONDA":
      return { nombre, frase: game.ronda?.text ?? "…" };
    case "REFLEJO":
      return { nombre, frase: game.reflejo ?? "…" };
    case "RETO":
      return tile.nickname ? { nombre, apodo: game.nickname ?? "…" } : { nombre, frase: game.reto ?? "…" };
    default:
      return { nombre };
  }
}

/** Datos que cambian en cada partida (nombre del jugador, quiénes están en la mesa, lo que sale al azar…): nunca se escriben a mano. */
const DYNAMIC_VARS = new Set(["nombre", "lista", "rivales", "categoria", "apodo", "frase", "dado", "resultado", "casilla", "pagados", "deuda"]);

/**
 * Huecos de una tarjeta que valen SIEMPRE lo mismo (por ejemplo «1 vaso» y «los hombres» en Machos): el editor los enseña ya escritos
 * dentro del texto, para que se edite el mismo texto que sale en el juego. Un hueco es fijo si es igual en todas las casillas que usan
 * la tarjeta y no depende de la partida. Los demás (`{nombre}`, `{destino}`…) se quedan entre llaves.
 */
export function staticCardVars(def: { tiles: number[]; vars: { name: string }[] }): Record<string, string | number> {
  if (!def.tiles.length) return {};
  const game = createGame([{ name: "Ana", color: "#fff" }, { name: "Beto", color: "#000" }, { name: "Caro", color: "#888" }]);
  const per = def.tiles.map((n) => tileVars(n, game, game.players[0].id));
  const out: Record<string, string | number> = {};
  for (const v of def.vars) {
    if (DYNAMIC_VARS.has(v.name)) continue;
    const first = per[0][v.name];
    if (first !== undefined && per.every((p) => p[v.name] === first)) out[v.name] = first;
  }
  return out;
}

/** Título y regla de la casilla `n` para el jugador `playerId`, con los datos de la partida (textos: `game/cards.ts`). */
export function tileRule(n: number, game: GameState, playerId: string, extra: Record<string, string | number> = {}): { title: string; text: string } {
  const tile = getTile(n);
  const rule = cardText(cardKeyOf(tile), { ...tileVars(n, game, playerId), ...extra });
  // un texto propio viejo de La Ouija puede no llevar el hueco {categoria}: la categoría que salió se añade siempre
  if (tile.type === "CULTURAL" && game.category && !rule.text.includes(game.category)) return { ...rule, text: `${rule.text}\nCategoría: «${game.category}».` };
  return rule;
}
