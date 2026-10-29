// El editor de tarjetas enseña el MISMO texto que sale en el juego (con los datos de ejemplo: «Ana», «la casilla 18»…) y se edita como
// cualquier texto. Al guardar, lo que coincide con un dato de ejemplo que cambia en cada partida se vuelve a convertir en su hueco
// ({nombre}, {casilla}…): así el admin nunca ve ni escribe llaves.
import { fillCard } from "@/game/cards";

type Vars = Record<string, string | number>;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordChar = /[\p{L}\p{N}]/u;

/** El texto con los datos de ejemplo puestos (lo que se enseña en la caja de edición). */
export const toDisplay = (raw: string, sample: Vars) => fillCard(raw, sample);

/** Lo escrito en la caja → el texto con huecos que se guarda: los datos de ejemplo que cambian en cada partida vuelven a ser huecos. */
export function toRaw(display: string, sample: Vars, dynamic: string[]) {
  const items = dynamic
    .map((name) => ({ name, value: String(sample[name] ?? "") }))
    .filter((x) => x.value)
    .sort((a, b) => b.value.length - a.value.length); // primero los más largos («Ana: Beto.» antes que «Ana»)
  let out = display;
  for (const { name, value } of items) {
    // que no sea parte de otra palabra o número (solo se comprueba en los extremos que son letra o número)
    const before = wordChar.test(value[0]) ? "(?<![\\p{L}\\p{N}])" : "";
    const after = wordChar.test(value[value.length - 1]) ? "(?![\\p{L}\\p{N}])" : "";
    out = out.replace(new RegExp(`${before}${esc(value)}${after}`, "gu"), `{${name}}`);
  }
  return out;
}
