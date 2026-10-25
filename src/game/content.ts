// Contenido para los retos: categorías del Examen de Humanología y trabalenguas.

export const CATEGORIES = [
  "marcas de cerveza",
  "cócteles",
  "países de Sudamérica",
  "capitales de Europa",
  "equipos de fútbol",
  "canciones de reguetón",
  "películas de Marvel",
  "frutas",
  "marcas de carros",
  "palabras que rimen con 'copa'",
  "personajes de Los Simpson",
  "animales de la selva",
  "apps del celular",
  "cosas que se hacen en una fiesta",
  "planetas y lunas",
  "nombres de exnovios/exnovias (de cualquiera)",
  "cantantes colombianos",
  "comidas rápidas",
  "deportes olímpicos",
  "excusas para no ir a trabajar",
];

export const TONGUE_TWISTERS = [
  "Tres tristes tigres tragaban trigo en un trigal.",
  "Pablito clavó un clavito, ¿qué clavito clavó Pablito?",
  "El cielo está enladrillado, ¿quién lo desenladrillará? El desenladrillador que lo desenladrille buen desenladrillador será.",
  "Compré pocas copas, pocas copas compré, y como compré pocas copas, pocas copas pagué.",
  "Erre con erre cigarro, erre con erre barril, rápido corren los carros cargados de azúcar del ferrocarril.",
  "Si el marciano bebe vino, el vino bebe al marciano.",
  "Pepe Pecas pica papas con un pico, con un pico pica papas Pepe Pecas.",
  "Me han dicho que has dicho un dicho que han dicho que he dicho yo.",
];

export function pick<T>(list: T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length)];
}
