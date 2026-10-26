// Explicación de cada casilla para la tarjeta grande de la TV: qué es y cuál es la regla.

import { TILE_NAMES, TRAIT_LABELS, getTile } from "./board";
import { jailBail, type GameState } from "./engine";

const vasos = (n: number) => `${n} ${n === 1 ? "vaso" : "vasos"}`;

/** Resultado de tirar estando perdido en el Cinturón de asteroides: con 5 o 6 escapa, si no bebe. */
export function mazeOutcome(name: string, roll: number): { escaped: boolean; title: string; text: string } {
  return roll >= 5
    ? { escaped: true, title: "¡Se salvó!", text: `${name} saca ${roll} y escapa del Cinturón de asteroides. No bebe y en su próximo turno vuelve a avanzar.` }
    : { escaped: false, title: "¡Sigue perdido!", text: `${name} saca ${roll}: no es 5 ni 6. Bebe 1 vaso y sigue perdido entre asteroides.` };
}

/** Resultado de tirar estando en el calabozo: siempre sale, pero bebe 2 (1-3) o 4 (4-6). */
export function jailOutcome(name: string, roll: number): { drinks: number; title: string; text: string } {
  const drinks = jailBail(roll);
  return { drinks, title: "¡Fianza pagada!", text: `${name} saca ${roll}: bebe ${vasos(drinks)} y sale del calabozo. Ahora vuelve a tirar para avanzar.` };
}

/** Resultado de un duelo, una línea por rival: quién sacó cuánto y quién bebe. */
export function duelOutcome(game: GameState): { title: string; text: string } | null {
  const d = game.lastDuel;
  if (!d) return null;
  const name = (id: string) => game.players.find((q) => q.id === id)?.name ?? "?";
  const lines = d.rounds.map((r) => `${name(d.by)} ${r.a} – ${name(r.rival)} ${r.b}: bebe ${name(r.loser)} 1 vaso.`);
  return { title: "¡Resultado del duelo!", text: lines.join("\n") };
}

/** Título y regla de la casilla `n` para el jugador `playerId`, con los datos de la partida. */
export function tileRule(n: number, game: GameState, playerId: string): { title: string; text: string } {
  const tile = getTile(n);
  const p = game.players.find((q) => q.id === playerId);
  const name = p?.name ?? "El jugador";
  switch (tile.type) {
    case "SALIDA":
      return { title: TILE_NAMES.SALIDA, text: "Tras la fiesta, los Ebrionautas se estrellaron en este planeta. Hay que ayudarlos a volver a la Nave Nodriza… aunque lleguen borrachos." };
    case "META":
      return { title: TILE_NAMES.META, text: "¡A bordo! El primero en subir a la nave gana (como pueda tenerse en pie) y reparte el resto de la bebida como quiera." };
    case "POSADA":
      return { title: TILE_NAMES.POSADA, text: `${name} reposta tranquilo: nadie le puede mandar beber hasta su próximo turno.` };
    case "A_BEBER":
      return { title: "¡A beber!", text: `${name} reparte ${vasos(tile.amount)} entre quien quiera (también se los puede quedar).` };
    case "DUELO":
      return {
        title: TILE_NAMES.DUELO,
        text: `${name} reta hasta a ${tile.amount} ${tile.amount === 1 ? "rival" : "rivales"}. Uno a uno tiran el dado: quien saque menos bebe 1 vaso. Si empatan, se repite.`,
      };
    case "OCA":
      return {
        title: "¡De OVNI en OVNI!",
        text: tile.next
          ? `${name} bebe 1 vaso diciendo «¡De OVNI en OVNI y bebo Calimocho!», el OVNI lo teletransporta al siguiente OVNI (casilla ${tile.next}) y vuelve a tirar.`
          : `Es el último OVNI: ${name} bebe 1 vaso diciendo «¡De OVNI en OVNI y bebo Calimocho!» y vuelve a tirar.`,
      };
    case "LABERINTO":
      return {
        title: TILE_NAMES.LABERINTO,
        text: `${name} se pierde entre asteroides. En sus turnos tira el dado: con 5 o 6 escapa; si no, bebe 1 vaso y sigue perdido.`,
      };
    case "REGLA":
      return {
        title: TILE_NAMES.REGLA,
        text: `${name} dicta una ley para todos (por ejemplo: prohibido decir «beber»). Dura hasta que alguien ponga otra. Quien la rompa, bebe 1 vaso.`,
      };
    case "CULTURAL":
      return {
        title: TILE_NAMES.CULTURAL,
        text: "Sale una categoría. Por turnos, cada uno dice una respuesta rápido; quien se quede en blanco o repita, bebe 1 vaso.",
      };
    case "HIPNOSIS":
      return {
        title: TILE_NAMES.HIPNOSIS,
        text: `${name} queda abducido: hasta su próximo turno, se bebe la mitad de todo lo que beban los demás.`,
      };
    case "CARCEL":
      return {
        title: TILE_NAMES.CARCEL,
        text: `${name} va al calabozo. En su próximo turno tira el dado para salir: con 1, 2 o 3 bebe 2 vasos; con 4, 5 o 6 bebe 4. Después vuelve a tirar para avanzar. Si otro jugador cae en su celda antes, sale gratis.`,
      };
    case "MUERTE":
      return { title: TILE_NAMES.MUERTE, text: `¡Qué mala suerte! El agujero negro se traga a ${name} y lo devuelve a la plataforma de despegue (casilla 1).` };
    case "PATINAZO":
      return {
        title: TILE_NAMES.PATINAZO,
        text: `Para no caerse, ${name} elige: bebe ${vasos(tile.drinks)} de golpe o retrocede hasta la casilla ${tile.backTo}.`,
      };
    case "POSICION": {
      const others = game.players.filter((q) => q.id !== playerId && (tile.who === "detras" ? q.pos < (p?.pos ?? 0) : q.pos > (p?.pos ?? 0)));
      return {
        title: tile.title,
        text: `Beben ${vasos(tile.drinks)} todos los que van ${tile.who === "detras" ? "por detrás" : "por delante"} de ${name}${others.length ? `: ${others.map((q) => q.name).join(", ")}.` : ". Esta vez, nadie."}`,
      };
    }
    case "RASGO":
      return {
        title: tile.title,
        text: `Estudio de especímenes humanos: beben ${vasos(tile.drinks)} ${tile.traits.map((t) => TRAIT_LABELS[t]).join(" y ")}.`,
      };
    case "ESCLAVO":
      return {
        title: TILE_NAMES.ESCLAVO,
        text: `${name} elige un esclavo: cada vez que ${name} beba, el esclavo bebe lo mismo. Dura hasta que otro caiga en esta casilla.`,
      };
    case "RETO":
      return { title: tile.title, text: tile.text };
  }
}
