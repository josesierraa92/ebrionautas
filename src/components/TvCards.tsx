"use client";
import { useEffect, useRef, useState } from "react";
import { shadeHex } from "@/lib/shadeHex";
import { DEFAULT_CHIP, NUMBER_FONTS, type ChipStyle } from "@/editor/layout";
import { characterOf } from "@/game/characters";
import Marciano from "@/components/Marciano";
import MaskIcon from "@/components/MaskIcon";
import { Cups } from "@/components/Winner";
import type { TrophyId } from "@/components/TrophyIcon";
import { avatarOf, expressionFor } from "@/game/avatar";
import { getTile, PATINAZO_DRINKS } from "@/game/board";
import { currentPlayer, matchOver, trophiesOf, type Decision, type GameState } from "@/game/engine";
import { cardKeyOf, cardTitle, hasCardOverride } from "@/game/cards";
import { duelRollCard, jailPayCard, tileRule } from "@/game/rules";
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
    case "NUNCA":
      return [cardTitle("YO_NUNCA"), `${name} dice en el celular si lo ha hecho: si sí, bebe.`];
    case "OCA":
      return [cardTitle("OCA"), `${name} decide si bebe para ${decision.next ? `volar hasta la casilla ${decision.next}` : "volver a tirar"} o se planta.`];
    case "PATINAZO":
      return [cardTitle("PATINAZO"), `${name}: bebe ${PATINAZO_DRINKS} de golpe o rueda hasta la casilla ${decision.backTo}.`];
    case "RULE":
      return [cardTitle("REGLA"), `${name} dicta una ley para todos. Quien la rompa, bebe.`];
    case "SLAVE":
      return [cardTitle("ESCLAVO"), `${name} elige con quién hace el pacto: beberá cada vez que ${name} beba.`];
    case "JAIL_PAY":
      return [cardTitle("CARCEL"), `${name} debe ${decision.owed} ${decision.owed === 1 ? "vaso" : "vasos"} del Purgatorio y elige cuántos paga ahora.`];
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
    case "NUNCA":
      return `${name} responde en el celular si lo ha hecho.`;
    case "OCA":
      return `${name} elige en el celular: beber y volar${decision.next ? ` a la ${decision.next}` : ""}, o plantarse.`;
    case "PATINAZO":
      return `${name} elige en el celular: beber o rodar hacia atrás.`;
    case "RULE":
      return `${name} dicta su ley en voz alta y toca «Ya la dicté» en el celular.`;
    case "SLAVE":
      return `${name} elige en el celular con quién hace el Pacto de Sangre.`;
    case "JAIL_PAY":
      return `${name} elige en el celular cuántos vasos paga del Purgatorio.`;
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
  // La Ouija: siempre la tarjeta, con la categoría que salió. Retos y exámenes: su texto propio salvo que el admin lo cambiara.
  if (tile.type !== "CULTURAL" && tile.type !== "YO_NUNCA" && tile.type !== "RASGO" && tile.type !== "REFLEJO" && !(tile.type === "RETO" && !tile.nickname) && !hasCardOverride(cardKeyOf(tile))) return { title: decision.title, text: decision.text };
  const rule = tileRule(n, game, playerId);
  return rule;
}

/** Contenido de la tarjeta (TV y celular): ícono, colores, título, regla y vasos. */
export function cardContent(game: GameState, n: number, playerId: string, result?: Landed["result"]) {
  const player = game.players.find((p) => p.id === playerId) ?? currentPlayer(game);
  // Resultado de una tirada sin moverse (niebla, purgatorio, duelo): verde si se salvó, rojo si bebe.
  const tile = getTile(n);
  const decision = game.decision && currentPlayer(game).id === playerId ? game.decision : null;
  // Purgatorio: mientras elige cuánto paga, la tarjeta dice cuánto debe (la tirada o la deuda de antes)
  const jailPay = decision?.kind === "JAIL_PAY" ? jailPayCard(game) : null;
  result = jailPay ?? (decision?.kind === "DUEL_ROLL" ? duelRollCard(game) : null) ?? result;
  const style = result
    ? { icon: result.icon ?? (result.good ? "✨" : result.drinks ? "🔥" : "🍷"), bg: result.good ? ["#8be86b", "#2fae4a"] : ["#ff8a8a", "#d62a3f"] }
    : TILE_STYLE[tile.type];
  // Retos y exámenes llevan su texto concreto (categoría, trabalenguas…) en la decisión.
  const rule = result ?? (decision?.kind === "SELECT_DRINKERS" ? decisionRule(decision, n, game, playerId) : tileRule(n, game, playerId));
  const drinks =
    decision?.kind === "JAIL_PAY"
      ? decision.owed
      : decision?.kind === "SELECT_DRINKERS"
      ? decision.drinks
      : decision?.kind === "DISTRIBUTE"
        ? decision.amount
        : decision?.kind === "OCA" || decision?.kind === "NUNCA"
          ? 1
          : decision?.kind === "PATINAZO"
          ? PATINAZO_DRINKS
          : result && !result.good && !result.tileIcon
            ? (result.drinks ?? 1)
            : "drinks" in tile
              ? tile.drinks
              : "amount" in tile && tile.type === "A_BEBER"
                ? Math.min(3, game.giftAmount ?? tile.amount)
                : null;
  // Encabezado claro (dado, gasolinera…): el texto pequeño va oscuro para que se lea.
  const light = !result && !TILE_STYLE[tile.type].dark;
  const accent = result ? (result.good ? "#5cd23c" : "#ffc61a") : TILE_ACCENT[tile.type];
  const icon = result && !result.tileIcon ? null : DEFAULT_ICON[tile.type]; // el resultado del duelo lleva el icono de su casilla
  return { player, style, decision, rule, drinks, light, accent, icon, emoji: style.icon };
}

export function RuleCard({ game, n, playerId, cardKey, result, scale = 1, wide = false, collapsible = false, suppressed = false }: Props & { scale?: number; /** celular vertical (modo «un solo aparato»): centrada y casi a todo el ancho, para que se lea */ wide?: boolean; /** mientras hay una decisión en marcha la tarjeta no se dibuja (la decisión lleva la suya) */ suppressed?: boolean; /** la tarjeta se guarda en un botón de la esquina al tocarla (y vuelve al tocar el botón): modo «un solo dispositivo» y online */ collapsible?: boolean }) {
  useCardTexts();
  const { player, decision, rule, accent, icon, emoji } = cardContent(game, n, playerId, result);
  // guardada = reducida al botón de la esquina; con una tarjeta nueva (otra casilla, otra tirada) vuelve a salir sola
  const [stored, setStored] = useState(false);
  const fresh = `${n}|${playerId}|${cardKey}|${game.rollSeq}`;
  useEffect(() => setStored(false), [fresh]);
  // al resolver una decisión (marcar quiénes beben, etc.) la tarjeta no vuelve a salir grande: queda guardada en su botón
  const hadDecision = useRef(false);
  useEffect(() => {
    if (hadDecision.current && !game.decision) setStored(true);
    hadDecision.current = !!game.decision;
  }, [game.decision]);
  const hidden = collapsible && stored;
  if (suppressed) return null;
  return (
    // Pequeña en la esquina: lo principal es que se vea el tablero. En el celular sale la misma tarjeta.
    <>
      <div
        className={wide ? "pointer-events-none absolute bottom-[17%] left-1/2 z-40 w-[88%] -translate-x-1/2" : "pointer-events-none absolute right-[1.5%] bottom-[3%] z-40 w-[25%]"}
        style={!wide && scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: "bottom right" } : undefined}
      >
        <div
          onClick={collapsible ? () => setStored(true) : undefined}
          className={collapsible && !hidden ? "pointer-events-auto cursor-pointer" : undefined}
          style={collapsible ? { transformOrigin: wide ? "92% 135%" : "100% 100%", transform: hidden ? "scale(0.08)" : "scale(1)", opacity: hidden ? 0 : 1, transition: "transform .4s cubic-bezier(.5,-0.2,.4,1.2), opacity .3s ease", pointerEvents: hidden ? "none" : undefined } : undefined}
        >
          <GameCard accent={accent} icon={icon} emoji={emoji} kicker={`Casilla ${n}`} title={rule.title} text={rule.text} prompt={decision ? decisionPrompt(decision, player.name, game) : null} dice={game.lastRoll} unit={wide ? "3.52cqw" : "1cqw"} cardKey={cardKey} />
        </div>
      </div>
      {collapsible && (
        <button
          onClick={() => setStored(false)}
          aria-label="Ver la tarjeta de la casilla"
          title="Ver la tarjeta"
          tabIndex={hidden ? 0 : -1}
          className={`btn-game absolute z-40 grid h-12 w-12 place-items-center bg-btn-green p-0 text-white ${wide ? "right-2 bottom-[calc(5%+3.75rem)]" : "right-[1.5%] bottom-[3%]"}`}
          style={{ transform: hidden ? "scale(1)" : "scale(0)", opacity: hidden ? 1 : 0, pointerEvents: hidden ? "auto" : "none", transition: "transform .35s cubic-bezier(.3,1.5,.5,1) .12s, opacity .2s ease .12s" }}
        >
          {icon ? <MaskIcon name={icon} color="#14260a" size="30px" /> : <span className="text-2xl leading-none">{emoji}</span>}
        </button>
      )}
    </>
  );
}

/**
 * La tarjeta de la casilla dentro del panel derecho de la TV (en lugar de la caja «Turno de…» con otro retrato del jugador, que repetía al personaje 3 veces):
 * el mismo diseño que sale en el tablero (`GameCard`), a todo el ancho del panel. `prompt` es lo que toca hacer cuando no hay una decisión en marcha
 * («Vane, tira el dado desde el celular»); con decisión, la pastilla dice qué marcar en el celular.
 */
export function PanelCard({ game, n, playerId, cardKey, result, prompt }: Props & { prompt?: string | null }) {
  useCardTexts();
  const { player, decision, rule, accent, icon, emoji } = cardContent(game, n, playerId, result);
  return (
    // el contenedor mide su ancho: la tarjeta está pensada para ~25 unidades de ancho (25 `--u`), así que 1 `--u` = 4 % del contenedor
    <div className="w-full" style={{ containerType: "inline-size" }}>
      <GameCard accent={accent} icon={icon} emoji={emoji} kicker={`Casilla ${n}`} title={rule.title} text={rule.text} prompt={decision ? decisionPrompt(decision, player.name, game) : (prompt ?? null)} dice={game.lastRoll} unit="4cqw" cardKey={cardKey} />
    </div>
  );
}

export function PhoneRuleCard({ game, n, playerId, cardKey, result, unit = "14px", showName = true }: Props & { unit?: string; /** poner el nombre del jugador en la pastilla (sin la tarjeta de usuario encima, que ya lo dice) */ showName?: boolean }) {
  useCardTexts();
  const { player, rule, accent, icon, emoji } = cardContent(game, n, playerId, result);
  return <GameCard accent={accent} icon={icon} emoji={emoji} kicker={showName ? `Casilla ${n} · ${player.name}` : `Casilla ${n}`} title={rule.title} text={rule.text} unit={unit} cardKey={cardKey} phone />;
}

/**
 * Esquina de la TV: de quién es el turno y la última tirada (quién tiró y cuánto sacó).
 * Mientras la TV anima la tirada (`moving`, `rolling`) no se adelanta el resultado ni el turno siguiente.
 */
// Solo quién tiene el turno: el dado ya se ve grande en el tablero y el número sale en el título de la jugada.
/** Pastillas de estado de un jugador (Poseído, Purgatorio / Debe N, Pacto de Sangre), como las del marcador; no dibuja nada si no tiene ninguno. */
export function StateChips({ game, player, className = "", style }: { game: GameState; player: GameState["players"][number]; className?: string; style?: React.CSSProperties }) {
  const nameOf = (id: string) => game.players.find((q) => q.id === id)?.name ?? "";
  const states: { icon: Parameters<typeof MaskIcon>[0]["name"]; text: string; color: string }[] = [];
  if (player.status.hipnosis) states.push({ icon: "ghost", text: "Poseído", color: "#5be8d4" });
  if (player.status.carcel) states.push({ icon: "flame", text: player.status.carcel.debt ? `Debe ${player.status.carcel.debt}` : "Purgatorio", color: "#ff6b3d" });
  if (game.slave?.slave === player.id) states.push({ icon: "drop", text: `← ${nameOf(game.slave.master)}`, color: "#ff4f6b" });
  if (game.slave?.master === player.id) states.push({ icon: "drop", text: `→ ${nameOf(game.slave.slave)}`, color: "#ff4f6b" });
  if (!states.length) return null;
  return (
    <div className={`flex flex-wrap justify-center ${className}`} style={{ gap: 6, ...style }}>
      {states.map((c) => (
        <span key={c.text} className="inline-flex items-center rounded-full font-display uppercase" style={{ gap: 5, padding: "2px 9px 2px 7px", fontSize: 13, lineHeight: 1.15, background: `linear-gradient(180deg, ${shadeHex(c.color, 0.18)} 0%, ${c.color} 55%, ${shadeHex(c.color, -0.2)} 100%)`, color: "#14102e" }}>
              <MaskIcon name={c.icon} color="#14102e" size="13px" />
              {c.text}
            </span>
      ))}
    </div>
  );
}

export function TurnChip({ game, moving = false, scale = 1, chip = DEFAULT_CHIP, inline = false, fill = false, playerId, topAlign = false }: { /** en la fila de botones de arriba (un solo aparato en celular vertical), sin bajarla debajo de ellos */ topAlign?: boolean; game: GameState; /** ocupar todo el ancho disponible (la placa se estira): la pantalla de la tarjeta del celular, del ancho de la tarjeta de abajo */ fill?: boolean; /** enseñar a este jugador en vez de a quien tiene el turno (la pantalla de la tarjeta del celular: de quién es) */ playerId?: string; moving?: boolean; rolling?: boolean; scale?: number; /** ajustes de la tarjeta (editor «Tarjeta de usuario») */ chip?: ChipStyle; /** sin colocarla en la esquina (vista previa del editor) */ inline?: boolean }) {
  const f = NUMBER_FONTS[chip.font];
  const fontFamily = chip.font === DEFAULT_CHIP.font ? undefined : `var(${f.cssVar}), ${f.fallback}`;
  const roller = game.players.find((p) => p.id === game.lastRoller);
  const winner = game.players.find((p) => p.id === game.winner);
  const who = winner ?? game.players.find((p) => p.id === playerId) ?? (moving && roller ? roller : currentPlayer(game));
  const color = who.color;
  // Placa de HUD de videojuego: retrato enmarcado con el color del jugador que sobresale de una placa oscura ladeada,
  // «Turno de» en el verde neón de las tarjetas (`#bffa58`) y 3 px más abajo, nombre con sombra dura azul muy oscuro, sin filete (todo en CSS, mismo estilo
  // grueso y plano que las tarjetas).
  return (
    <div className={`pointer-events-none z-30 flex items-center ${fill ? "w-full" : ""} ${inline ? "relative" : (topAlign ? "absolute top-[2%] left-[2%]" : "absolute top-[2%] left-[2%] max-md:top-16 max-md:scale-90 max-md:origin-top-left")}`} style={scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: "top left" } : undefined}>
      {/* anillo de color del jugador con degradado (más claro arriba a la izquierda, más oscuro abajo a la derecha) */}
      <div className="relative z-10 -mr-[30px] -ml-[5px] shrink-0" style={{ padding: 5, borderRadius: 21, background: `linear-gradient(150deg, ${shadeHex(color, 0.12)} 0%, ${color} 35%, ${shadeHex(color, -0.38)} 100%)`, boxShadow: "0 6px 12px rgba(0,0,0,.45)" }}>
        <div
          className="grid place-items-center overflow-hidden rounded-2xl border-[4px] border-[#1b0a40]"
          style={{ width: 84, height: 84, background: "radial-gradient(circle at 50% 50%, #5a31ad 0%, #3a1d7a 50%, #1a0b38 100%)" }}
        >
          <Marciano avatar={avatarOf(who)} expression={expressionFor(who, { winner: game.winner, isTurn: true })} size={Math.round(62 * chip.zombie / 100)} character={characterOf(game.players, who.id)} />
        </div>
        <Cups
          {...trophiesOf(game, who)}
          gap={chip.gap}
          glow={{ color: chip.glowColor, strength: chip.glow, reach: chip.reach }}
          size={`${(chip.cupSize / 100) * 1.3}em`}
          cup={{ fill: chip.cupColor, outline: chip.outlineColor, stroke: chip.outline, }}
          starIcon={chip.icon as TrophyId}
          trophyIcon={chip.winIcon as TrophyId}
          className="absolute z-20 text-2xl"
          style={{ top: `${chip.cupY}%`, left: `${chip.cupX}%` }}
        />
        {!winner && !fill && <StateChips game={game} player={who} className="absolute z-30 w-max" style={{ bottom: 0, left: "50%", transform: "translate(-50%, 50%)" }} />}
      </div>
      <div className={`relative ${fill ? "min-w-0 flex-1" : ""}`}>
      <div className="relative overflow-hidden rounded-2xl border-[5px] border-[#452b8e] py-1 pr-[26px] pl-[47px] shadow-[0_6px_12px_rgba(0,0,0,.45)]" style={{ background: "linear-gradient(180deg, #2f1768 0%, #29155a 50%, #210f4d 100%)" }}>
        <div className={fill ? "text-center" : undefined}>
          <p className="relative top-[4px] font-display text-[1rem] leading-none tracking-wider uppercase" style={{ color: chip.labelColor, fontFamily }}>
            {winner ? (matchOver(game) ? "¡Ganador!" : "¡Gana la ronda!") : "Turno de"}
          </p>
          <p className="mt-1 font-display leading-none uppercase" style={{ fontSize: `${(fill ? 3.3 : 2.6) * chip.nameSize / 100}rem`, color: chip.nameColor, fontFamily, textShadow: "0 2px 0 #1a0b38, 0 3px 0 #1a0b38" }}>
            {who.name}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
