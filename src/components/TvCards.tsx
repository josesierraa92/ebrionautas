import Marciano from "@/components/Marciano";
import { avatarOf, expressionFor } from "@/game/avatar";
import { getTile } from "@/game/board";
import { currentPlayer, type Decision, type GameState } from "@/game/engine";
import { TILE_STYLE } from "@/game/tileStyle";

const DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

/** Título y texto de lo que se está decidiendo, para leerlo en la TV. */
export function decisionText(decision: Decision, name: string): [string, string] {
  switch (decision.kind) {
    case "DISTRIBUTE":
      return ["Ronda de combustible", `${name} reparte ${decision.amount} ${decision.amount === 1 ? "vaso" : "vasos"} entre quien quiera.`];
    case "DUEL":
      return ["Duelo de dados láser", `${name} reta hasta a ${decision.amount} ${decision.amount === 1 ? "rival" : "rivales"}. Quien saque menos, bebe.`];
    case "SELECT_DRINKERS":
      return [decision.title, decision.text];
    case "PATINAZO":
      return ["¡Resbalón en Saturno!", `${name}: bebe ${decision.drinks} de golpe o cae hasta la casilla ${decision.backTo}.`];
    case "RULE":
      return ["Ley del Consejo Galáctico", `${name} dicta una ley para todos. Quien la rompa, bebe.`];
    case "SLAVE":
      return ["Esclavos", `${name} elige un esclavo: beberá cada vez que su amo beba.`];
    case "CARCEL":
      return ["Calabozo Intergaláctico", `${name}: paga la fianza de ${decision.bail} vasos o espera a que caiga otro.`];
  }
}

/** Tarjeta grande en el centro de la TV, como las cartas de Monopoly. */
export function DecisionCard({ game }: { game: GameState }) {
  if (!game.decision) return null;
  const me = currentPlayer(game);
  const style = TILE_STYLE[getTile(me.pos).type];
  const [title, text] = decisionText(game.decision, me.name);
  const drinks = game.decision.kind === "SELECT_DRINKERS" ? game.decision.drinks : null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-ink/35 p-[3%]">
      <div key={game.decisionSeq} className="card-pop w-[min(62%,46rem)] overflow-hidden rounded-[2rem] border-[5px] border-ink bg-[#fbf3e4] shadow-[0_10px_0_#1b1f4b]">
        <div className="flex items-center gap-[3cqw] px-[3cqw] py-[1.6cqw]" style={{ background: `linear-gradient(160deg, ${style.bg[0]}, ${style.bg[1]})` }}>
          <span className="leading-none drop-shadow-[0_3px_0_rgba(0,0,0,.3)]" style={{ fontSize: "6cqw" }}>
            {style.icon}
          </span>
          <h2 className="banner-text font-display leading-none text-white" style={{ fontSize: "4.2cqw" }}>
            {title}
          </h2>
        </div>
        <div className="flex flex-col gap-[1.4cqw] px-[3.5cqw] py-[2.4cqw] text-ink">
          <p className="font-display leading-snug" style={{ fontSize: "2.6cqw" }}>
            {text}
          </p>
          <div className="flex items-center justify-between gap-4" style={{ fontSize: "1.8cqw" }}>
            <span className="flex items-center gap-[1cqw] font-display">
              <Marciano avatar={avatarOf(me)} expression="feliz" size={40} className="h-auto w-[4cqw]" />
              Turno de {me.name}
            </span>
            {drinks !== null && (
              <span className="rounded-full border-[3px] border-ink bg-btn-red px-[1.4cqw] py-[0.3cqw] font-display text-white">
                🍷 {drinks} {drinks === 1 ? "vaso" : "vasos"}
              </span>
            )}
          </div>
          <p className="text-center font-display text-ink/60" style={{ fontSize: "1.6cqw" }}>
            📱 Se decide en el celular
          </p>
        </div>
      </div>
    </div>
  );
}

/** Indicador pequeño de turno sobre el tablero, para cuando el panel está oculto. */
export function TurnChip({ game }: { game: GameState }) {
  const me = currentPlayer(game);
  const winner = game.players.find((p) => p.id === game.winner);
  const who = winner ?? me;
  return (
    <div className="pointer-events-none absolute top-[2%] left-[2%] z-30 flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-ink/85 py-1.5 pr-4 pl-2 text-white">
      <Marciano avatar={avatarOf(who)} expression={expressionFor(who, { winner: game.winner, isTurn: true })} size={44} />
      <div className="leading-tight">
        <p className="text-xs text-white/70">{winner ? "¡Ganador!" : "Turno de"}</p>
        <p className="font-display text-xl">{who.name}</p>
      </div>
      {!winner && game.lastRoll && <span className="text-4xl leading-none">{DICE[game.lastRoll]}</span>}
    </div>
  );
}
