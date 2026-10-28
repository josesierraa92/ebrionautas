import { characterOf } from "@/game/characters";
import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { getTile } from "@/game/board";
import { currentPlayer, type Decision, type GameState } from "@/game/engine";
import { cardKeyOf, hasCardOverride } from "@/game/cards";
import { tileRule } from "@/game/rules";
import { useCardTexts } from "@/lib/useCardTexts";
import { TILE_STYLE, tileArt } from "@/game/tileStyle";
import type { Landed } from "@/lib/useGameFx";

/** Título y texto de lo que se está decidiendo, para leerlo en la TV. */
export function decisionText(decision: Decision, name: string): [string, string] {
  switch (decision.kind) {
    case "DISTRIBUTE":
      return ["Ronda de mezcal", `${name} reparte ${decision.amount} ${decision.amount === 1 ? "vaso" : "vasos"} entre quien quiera.`];
    case "DUEL":
      return ["Duelo de calaveras", `${name} reta hasta a ${decision.amount} ${decision.amount === 1 ? "rival" : "rivales"}. Quien saque menos, bebe.`];
    case "SELECT_DRINKERS":
      return [decision.title, decision.text];
    case "PATINAZO":
      return ["¡Tropiezo con la lápida!", `${name}: bebe ${decision.drinks} de golpe o rueda hasta la casilla ${decision.backTo}.`];
    case "RULE":
      return ["Ley del Más Allá", `${name} dicta una ley para todos. Quien la rompa, bebe.`];
    case "SLAVE":
      return ["Pacto de Sangre", `${name} elige con quién hace el pacto: beberá cada vez que ${name} beba.`];
  }
}

/** Qué hay que hacer en el celular para resolver la decisión. */
function decisionPrompt(decision: Decision, name: string): string {
  switch (decision.kind) {
    case "DISTRIBUTE":
      return `${name} reparte los vasos desde el celular.`;
    case "DUEL":
      return `${name} elige a sus rivales en el celular.`;
    case "SELECT_DRINKERS":
      return "Marcad en el celular quién bebe.";
    case "PATINAZO":
      return `${name} elige en el celular: beber o rodar hacia atrás.`;
    case "RULE":
      return `${name} escribe su ley en el celular.`;
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
                ? tile.amount
                : null;
  // Encabezado claro (dado, gasolinera…): el texto pequeño va oscuro para que se lea.
  const light = !result && !TILE_STYLE[tile.type].dark;
  return { player, style, decision, rule, drinks, light };
}

export function RuleCard({ game, n, playerId, cardKey, result }: Props) {
  useCardTexts();
  const { player, style, decision, rule, light } = cardContent(game, n, playerId, result);
  return (
    // Pequeña en la esquina: lo principal es que se vea el tablero. En el celular sale la misma tarjeta.
    <div className="pointer-events-none absolute right-[1.5%] bottom-[3%] z-40 w-[25%]">
      <div key={cardKey} className="card-pop w-full overflow-hidden rounded-[1.2rem] border-[3px] border-ink bg-[#fbf3e4] shadow-[0_6px_0_#1b1f4b]">
        <div className="flex items-center gap-[1cqw] px-[1.3cqw] py-[0.7cqw]" style={{ background: `linear-gradient(160deg, ${style.bg[0]}, ${style.bg[1]})` }}>
          <img src={tileArt(getTile(n).type)} alt="" className="h-auto shrink-0 drop-shadow-[0_3px_0_rgba(0,0,0,.3)]" style={{ width: "4.5cqw" }} />
          <div className="min-w-0">
            <p className={`font-display ${light ? "text-ink/70" : "text-white/90 drop-shadow-[0_2px_0_rgba(0,0,0,.35)]"}`} style={{ fontSize: "0.95cqw" }}>
              Casilla {n}
            </p>
            <h2 className="banner-text-sm font-display leading-tight text-white" style={{ fontSize: "1.8cqw" }}>
              {rule.title}
            </h2>
          </div>
        </div>
        <div className="flex flex-col gap-[0.7cqw] px-[1.3cqw] py-[1cqw] text-ink">
          <p className="font-display leading-snug whitespace-pre-line" style={{ fontSize: "1.25cqw" }}>
            {rule.text}
          </p>
          {decision && (
            <p className="rounded-2xl bg-btn-yellow/30 px-[0.8cqw] py-[0.4cqw] text-center font-display" style={{ fontSize: "1.1cqw" }}>
              📱 {decisionPrompt(decision, player.name)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** La misma tarjeta, en grande para leerla en el celular. */
export function PhoneRuleCard({ game, n, playerId, cardKey, result }: Props) {
  useCardTexts();
  const { player, style, rule, drinks, light } = cardContent(game, n, playerId, result);
  return (
    <div key={cardKey} className="card-pop w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-[#fbf3e4] text-left shadow-[0_5px_0_#1b1f4b]">
      <div className="flex items-center gap-3 px-3 py-2" style={{ background: `linear-gradient(160deg, ${style.bg[0]}, ${style.bg[1]})` }}>
        <img src={tileArt(getTile(n).type)} alt="" className="h-14 w-14 shrink-0 drop-shadow-[0_2px_0_rgba(0,0,0,.3)]" />
        <div className="min-w-0">
          <p className={`font-display text-xs ${light ? "text-ink/70" : "text-white/90 drop-shadow-[0_1px_0_rgba(0,0,0,.35)]"}`}>
            Casilla {n} · {player.name}
          </p>
          <h3 className="banner-text-sm font-display text-2xl leading-tight text-white">{rule.title}</h3>
        </div>
        {drinks !== null && (
          <span className="ml-auto shrink-0 rounded-full border-2 border-ink bg-btn-red px-2 py-0.5 font-display text-sm text-white">
            🍷 {drinks}
          </span>
        )}
      </div>
      <p className="px-3 py-2 font-display text-lg leading-snug whitespace-pre-line text-ink">{rule.text}</p>
    </div>
  );
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
  return (
    <div className="pointer-events-none absolute top-[2%] left-[2%] z-30 flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-ink/85 py-2 pr-5 pl-2 text-white max-md:top-16 max-md:scale-90 max-md:origin-top-left">
      <Marciano avatar={avatarOf(who)} expression={expressionFor(who, { winner: game.winner, isTurn: true })} size={60} character={characterOf(game.players, who.id)} />
      <div className="leading-tight">
        <p className="text-sm text-white/70">{winner ? "¡Ganador!" : "Turno de"}</p>
        <p className="font-display text-3xl">{who.name}</p>
      </div>
    </div>
  );
}
