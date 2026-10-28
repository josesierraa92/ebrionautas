import { characterOf } from "@/game/characters";
import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { getTile } from "@/game/board";
import { currentPlayer, type Decision, type GameState } from "@/game/engine";
import { cardKeyOf, cardTitle, hasCardOverride } from "@/game/cards";
import { tileRule } from "@/game/rules";
import { useCardTexts } from "@/lib/useCardTexts";
import GameCard from "@/components/GameCard";
import { DEFAULT_ICON } from "@/editor/icons";
import { TILE_ACCENT, TILE_STYLE } from "@/game/tileStyle";
import type { Landed } from "@/lib/useGameFx";

/** Título y texto de lo que se está decidiendo, para leerlo en la TV. */
export function decisionText(decision: Decision, name: string): [string, string] {
  switch (decision.kind) {
    case "DISTRIBUTE":
      return [cardTitle("A_BEBER"), `${name} reparte ${decision.amount} ${decision.amount === 1 ? "vaso" : "vasos"} entre quien quiera.`];
    case "DUEL":
      return [cardTitle("DUELO"), `${name} reta hasta a ${decision.amount} ${decision.amount === 1 ? "rival" : "rivales"}. Quien saque menos, bebe.`];
    case "DUEL_ROLL":
      return [cardTitle("DUELO"), `${name} y su rival tiran el dado: quien saque menos, bebe.`];
    case "SELECT_DRINKERS":
      return [decision.title, decision.text];
    case "PATINAZO":
      return [cardTitle("PATINAZO"), `${name}: bebe ${decision.drinks} de golpe o rueda hasta la casilla ${decision.backTo}.`];
    case "RULE":
      return [cardTitle("REGLA"), `${name} dicta una ley para todos. Quien la rompa, bebe.`];
    case "SLAVE":
      return [cardTitle("ESCLAVO"), `${name} elige con quién hace el pacto: beberá cada vez que ${name} beba.`];
  }
}

/** Qué hay que hacer en el celular para resolver la decisión. */
function decisionPrompt(decision: Decision, name: string, game?: GameState): string {
  switch (decision.kind) {
    case "DISTRIBUTE":
      return `${name} reparte los vasos desde el celular.`;
    case "DUEL":
      return `${name} elige a sus rivales en el celular.`;
    case "DUEL_ROLL": {
      const nm = (id: string) => game?.players.find((q) => q.id === id)?.name ?? "?";
      const rival = nm(decision.rivals[decision.i]);
      const fresh = decision.a === null || decision.b !== null;
      if (decision.tie) return `¡Empate! Vuelven a tirar: primero ${name}, en el celular.`;
      return fresh ? `Tira el dado de ${name} en el celular.` : `${name} sacó ${decision.a}. Ahora tira el dado de ${rival} en el celular.`;
    }
    case "SELECT_DRINKERS":
      return "Marcad en el celular quién bebe.";
    case "PATINAZO":
      return `${name} elige en el celular: beber o rodar hacia atrás.`;
    case "RULE":
      return `${name} dicta su ley en voz alta y toca «Ya la dicté» en el celular.`;
    case "SLAVE":
      return `${name} elige en el celular con quién hace el Pacto de Sangre.`;
  }
}

/**
 * Tarjeta grande en el centro de la TV, como las cartas de Monopoly: explica la
 * casilla en la que cayó alguien y, si hay que decidir algo, qué se decide.
 */
type Props = { game: GameState; n: number; playerId: string; cardKey: number; result?: Landed["result"] };

/**
 * Retos y exámenes llevan su texto concreto (categoría, trabalenguas…) en la decisión; si el admin cambió la tarjeta
 * desde el editor, se usa su texto y se le añade lo que sale al azar.
 */
function decisionRule(decision: Extract<NonNullable<GameState["decision"]>, { kind: "SELECT_DRINKERS" }>, n: number, game: GameState, playerId: string) {
  const tile = getTile(n);
  if (!hasCardOverride(cardKeyOf(tile))) return { title: decision.title, text: decision.text };
  const categoria = /Categoría: "([^"]+)"/.exec(decision.text)?.[1] ?? "";
  const rule = tileRule(n, game, playerId, { categoria });
  const twister = /«([^»]+)»\s*$/.exec(decision.text)?.[1];
  return twister && tile.type === "RETO" ? { ...rule, text: `${rule.text} «${twister}»` } : rule;
}

/** Contenido de la tarjeta (TV y celular): ícono, colores, título, regla y vasos. */
export function cardContent(game: GameState, n: number, playerId: string, result?: Landed["result"]) {
  const player = game.players.find((p) => p.id === playerId) ?? currentPlayer(game);
  // Resultado de una tirada sin moverse (niebla, purgatorio, duelo): verde si se salvó, rojo si bebe.
  const tile = getTile(n);
  const style = result
    ? { icon: result.icon ?? (result.good ? "✨" : result.drinks ? "🔓" : "🍷"), bg: result.good ? ["#8be86b", "#2fae4a"] : ["#ff8a8a", "#d62a3f"] }
    : TILE_STYLE[tile.type];
  const decision = game.decision && currentPlayer(game).id === playerId ? game.decision : null;
  // Retos y exámenes llevan su texto concreto (categoría, trabalenguas…) en la decisión.
  const rule = result ?? (decision?.kind === "SELECT_DRINKERS" ? decisionRule(decision, n, game, playerId) : tileRule(n, game, playerId));
  const drinks =
    decision?.kind === "SELECT_DRINKERS"
      ? decision.drinks
      : decision?.kind === "DISTRIBUTE"
        ? decision.amount
        : decision?.kind === "PATINAZO"
          ? decision.drinks
          : result && !result.good && !result.icon
            ? (result.drinks ?? 1)
            : "drinks" in tile
              ? tile.drinks
              : "amount" in tile && tile.type === "A_BEBER"
                ? (game.giftAmount ?? tile.amount)
                : null;
  // Encabezado claro (dado, gasolinera…): el texto pequeño va oscuro para que se lea.
  const light = !result && !TILE_STYLE[tile.type].dark;
  const accent = result ? (result.good ? "#5cd23c" : "#ffc61a") : TILE_ACCENT[tile.type];
  const icon = result ? null : DEFAULT_ICON[tile.type];
  return { player, style, decision, rule, drinks, light, accent, icon, emoji: style.icon };
}

export function RuleCard({ game, n, playerId, cardKey, result }: Props) {
  useCardTexts();
  const { player, decision, rule, accent, icon, emoji } = cardContent(game, n, playerId, result);
  return (
    // Pequeña en la esquina: lo principal es que se vea el tablero. En el celular sale la misma tarjeta.
    <div className="pointer-events-none absolute right-[1.5%] bottom-[3%] z-40 w-[25%]">
      <GameCard accent={accent} icon={icon} emoji={emoji} kicker={`Casilla ${n}`} title={rule.title} text={rule.text} prompt={decision ? decisionPrompt(decision, player.name, game) : null} unit="1cqw" cardKey={cardKey} />
    </div>
  );
}

export function PhoneRuleCard({ game, n, playerId, cardKey, result, unit = "14px" }: Props & { unit?: string }) {
  useCardTexts();
  const { player, rule, accent, icon, emoji } = cardContent(game, n, playerId, result);
  return <GameCard accent={accent} icon={icon} emoji={emoji} kicker={`Casilla ${n} · ${player.name}`} title={rule.title} text={rule.text} unit={unit} cardKey={cardKey} />;
}

/**
 * Esquina de la TV: de quién es el turno y la última tirada (quién tiró y cuánto sacó).
 * Mientras la TV anima la tirada (`moving`, `rolling`) no se adelanta el resultado ni el turno siguiente.
 */
// Solo quién tiene el turno: el dado ya se ve grande en el tablero y el número sale en el título de la jugada.
export function TurnChip({ game, moving = false }: { game: GameState; moving?: boolean; rolling?: boolean }) {
  const roller = game.players.find((p) => p.id === game.lastRoller);
  const winner = game.players.find((p) => p.id === game.winner);
  const who = winner ?? (moving && roller ? roller : currentPlayer(game));
  const color = who.color;
  // Placa de HUD de videojuego: retrato enmarcado con el color del jugador que sobresale de una placa oscura ladeada,
  // «Turno de» en texto morado, nombre con sombra dura azul muy oscuro, sin filete (todo en CSS, mismo estilo
  // grueso y plano que las tarjetas).
  return (
    <div className="pointer-events-none absolute top-[2%] left-[2%] z-30 flex items-center max-md:top-16 max-md:scale-90 max-md:origin-top-left">
      <div
        className="relative z-10 -mr-5 grid shrink-0 place-items-center overflow-hidden rounded-2xl border-[4px] border-ink"
        style={{ width: 84, height: 84, background: `radial-gradient(circle at 50% 35%, ${color}88, ${color}22 70%), #14173d`, boxShadow: `0 0 0 3px ${color}, 0 5px 0 3px ${color}, 0 8px 14px rgba(0,0,0,.45)` }}
      >
        <Marciano avatar={avatarOf(who)} expression={expressionFor(who, { winner: game.winner, isTurn: true })} size={62} character={characterOf(game.players, who.id)} />
      </div>
      <div className="relative -skew-x-6 overflow-hidden rounded-xl border-[4px] border-[#1a0b38] bg-[#2d1460]/95 py-2 pr-7 pl-9 shadow-[0_6px_0_#1a0b38,0_10px_16px_rgba(0,0,0,.45)]">
        <div className="skew-x-6">
          <p className="font-display text-sm leading-none tracking-wider text-btn-special uppercase">
            {winner ? "¡Ganador!" : "Turno de"}
          </p>
          <p className="mt-1 font-display text-4xl leading-none text-white uppercase" style={{ textShadow: "0 3px 0 #1a0b38, 0 5px 0 #1a0b38" }}>
            {who.name}
          </p>
        </div>
      </div>
    </div>
  );
}
