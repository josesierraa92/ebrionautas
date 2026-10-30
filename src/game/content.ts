// Contenido para los retos: categorías de La Ouija y trabalenguas.

/** Categorías de serie (el admin puede cambiarlas desde el editor: ver `getCategories`). */
export const DEFAULT_CATEGORIES = [
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
  "películas de terror",
  "nombres de exnovios/exnovias (de cualquiera)",
  "cantantes colombianos",
  "comidas rápidas",
  "deportes olímpicos",
  "excusas para no ir a trabajar",
];

/** Valida una lista que llega del editor o del almacén: textos cortos, sin repetir, hasta 200; si queda vacía, la de serie. */
function cleanList(raw: unknown, fallback: string[], maxLen: number): string[] {
  if (!Array.isArray(raw)) return fallback;
  const out: string[] = [];
  for (const x of raw) {
    const t = typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, maxLen) : "";
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= 200) break;
  }
  return out.length ? out : fallback;
}

let categories: string[] = DEFAULT_CATEGORIES;
/** Las categorías vigentes de La Ouija (las de serie, o las que el admin dejó en el editor). */
export const getCategories = () => categories;
export function setCategories(list: string[]) {
  categories = list.length ? list : DEFAULT_CATEGORIES;
}
export const parseCategories = (raw: unknown) => cleanList(raw, DEFAULT_CATEGORIES, 60);

/** Trabalenguas de serie (Lenguados); el admin puede cambiarlos desde el editor. */
export const DEFAULT_TWISTERS = [
  "Tres tristes tigres tragaban trigo en un trigal.",
  "Pablito clavó un clavito, ¿qué clavito clavó Pablito?",
  "El cielo está enladrillado, ¿quién lo desenladrillará? El desenladrillador que lo desenladrille buen desenladrillador será.",
  "Compré pocas copas, pocas copas compré, y como compré pocas copas, pocas copas pagué.",
  "Erre con erre cigarro, erre con erre barril, rápido corren los carros cargados de azúcar del ferrocarril.",
  "Si la calaca bebe mezcal, el mezcal se bebe a la calaca.",
  "Pepe Pecas pica papas con un pico, con un pico pica papas Pepe Pecas.",
  "Me han dicho que has dicho un dicho que han dicho que he dicho yo.",
];
let twisters: string[] = DEFAULT_TWISTERS;
export const getTwisters = () => twisters;
export function setTwisters(list: string[]) {
  twisters = list.length ? list : DEFAULT_TWISTERS;
}
export const parseTwisters = (raw: unknown) => cleanList(raw, DEFAULT_TWISTERS, 240);

/** Apodos de serie: en la casilla «Nuevo apodo» sale uno al azar y quien se equivoque al llamarlo bebe. */
export const DEFAULT_NICKNAMES = ["Chorizo", "Pelón", "Mochila", "Pelusa", "Chiquitín", "Mazorca", "Sapo", "Tarzán", "Cucharita", "Paquete", "Pulga", "Tilín"];
let nicknames: string[] = DEFAULT_NICKNAMES;
export const getNicknames = () => nicknames;
export function setNicknames(list: string[]) {
  nicknames = list.length ? list : DEFAULT_NICKNAMES;
}
export const parseNicknames = (raw: unknown) => cleanList(raw, DEFAULT_NICKNAMES, 30);

/** Frases de «Yo nunca»: al caer sale una al azar y beben los que sí lo hayan hecho. */
export const DEFAULT_NUNCA = [
  "Yo nunca he hecho algo ilegal.",
  "Yo nunca me he roto un hueso.",
  "Yo nunca he salido con alguien de una app de citas.",
  "Yo nunca he mandado un mensaje de texto a la persona equivocada.",
  "Yo nunca me he quedado dormido en el cine.",
  "Yo nunca he espiado el teléfono de mi pareja.",
  "Yo nunca he mentido sobre mi edad.",
  "Yo nunca he fingido estar enfermo para no ir a trabajar o estudiar.",
  "Yo nunca me he tragado un chicle por accidente.",
  "Yo nunca he entrado a un baño público y me he dado cuenta de que no hay papel higiénico cuando ya es tarde.",
  "Yo nunca he stalkeado tanto a alguien en redes sociales que terminé dándole \"like\" a una foto de hace años por error.",
  "Yo nunca he olvidado por completo el nombre de una persona justo después de que se acaba de presentar.",
  "Yo nunca he probado la comida de mi mascota por curiosidad.",
  "Yo nunca he llorado viendo una película animada.",
  "Yo nunca he guardado un secreto que me prometí no contar y terminé contándolo.",
  "Yo nunca he fingido que me gusta un regalo que en realidad odiaba.",
  "Yo nunca me he tropezado en la calle con total elegancia fingiendo que no pasó nada.",
  "Yo nunca he tenido un sueño tan real que al despertar me he enojado de verdad con esa persona.",
  "Yo nunca he puesto una excusa inventada solo para cancelar un plan y quedarme en casa durmiendo.",
  "Yo nunca he intentado descifrar una contraseña tantas veces que terminé bloqueando la cuenta.",
  "Yo nunca me he reído en el peor momento posible, como en un funeral o una situación seria.",
  "Yo nunca he dejado la alarma sonando por más de diez minutos molestando a todos en la casa.",
  "Yo nunca he intentado hacer una receta de cocina viendo un video y ha terminado siendo un desastre total.",
  "Yo nunca he perdido un vuelo, un autobús o una cita importante por confiarme demasiado con el tiempo.",
  "Yo nunca he dicho \"en cinco minutos estoy listo\" cuando ni siquiera me he bañado.",
  "Yo nunca he intentado abrir una puerta que decía \"empujar\" tirando de ella con fuerza.",
  "Yo nunca he guardado una caja vacía \"por si acaso algún día sirve para algo\".",
  "Yo nunca he aplaudido cuando el avión aterriza.",
  "Yo nunca he culpado al perro (o a la mascota) de un gas que solté yo.",
  "Yo nunca he dicho \"no tengo preferencia, elige tú dónde cenar\" y luego le he dicho que no a todas sus opciones.",
  "Yo nunca he intentado culpar a mi pareja de algo que hice mal yo, solo por ganar la discusión.",
  "Yo nunca le he robado la cobija o la sábana a mi pareja en plena madrugada dejándola sin nada.",
  "Yo nunca he escondido una compra nueva para que mi pareja no se entere de cuánto costó.",
  "Yo nunca he mirado el plato de mi pareja con ojos de águila esperando a que me ofrezca de su comida.",
  "Yo nunca he hecho una mueca o gesto gracioso mientras mi pareja está tomándonos una foto \"seria\".",
  "Yo nunca he intentado buscar una serie para ver juntos, pasar una hora solo buscando.",
  "Yo nunca he puesto una excusa ridícula para evitar ir a una reunión familiar que no me apetecía.",
  "Yo nunca he intentado adivinar la contraseña del celular de mi pareja por pura curiosidad.",
  "Yo nunca he comprado un regalo de aniversario o cumpleaños el mismo día, corriendo a última hora.",
  "Yo nunca me he quedado dormido en pleno acto.",
  "Yo nunca he usado un juguete sexual con mi pareja.",
  "Yo nunca he dicho el nombre equivocado en un momento de pasión.",
  "Yo nunca he tenido relaciones en un lugar público o arriesgado.",
  "Yo nunca he fingido un orgasmo para terminar más rápido.",
  "Yo nunca me he reído a carcajadas por un ruido gracioso e inesperado en la cama.",
  "Yo nunca he probado el juego de roles o disfraces en la intimidad.",
  "Yo nunca he enviado o recibido una foto o video subido de tono (nudes).",
  "Yo nunca he probado comida (crema, chocolate, etc.) en el cuerpo de mi pareja.",
  "Yo nunca he sido atrapado o interrumpido por un familiar, amigo o mascota en pleno momento picoso.",
  "Yo nunca he tenido relaciones en la ducha.",
  "Yo nunca he dejado una marca o \"chupón\" visible por accidente.",
  "Yo nunca he empezado el momento íntimo solo porque tenía frío y quería calentar la cama."
];
let nunca: string[] = DEFAULT_NUNCA;
export const getNunca = () => nunca;
export function setNunca(list: string[]) {
  nunca = list.length ? list : DEFAULT_NUNCA;
}
export const parseNunca = (raw: unknown) => cleanList(raw, DEFAULT_NUNCA, 200);

/** Juicio de los vivos: cada vez sale una de estas cartas al azar (votaciones y «beben todos los que…»). */
export const DEFAULT_JUICIO = [
  "Votad por la persona más dramática del grupo; esa persona bebe.",
  "Votad por la persona que siempre llega tarde; esa persona bebe.",
  "Votad por la persona que más tiempo pasa en el celular; esa persona bebe.",
  "Votad por la persona que mejor baila del grupo; esa persona bebe.",
  "Votad por la persona que se emborracha más rápido; esa persona bebe.",
  "Votad por la persona mas chistosa; esa persona bebe.",
  "Votad por la persona que más gasta dinero en tonterías; esa persona bebe.",
  "Votad por la persona más malhablada del grupo; esa persona bebe.",
  "Votad por la persona que sería la primera en morir en un apocalipsis zombi; esa persona bebe.",
  "Votad por la persona que peor maneja / conduce; esa persona bebe.",
  "Votad por la persona más enamoradiza del grupo; esa persona bebe.",
  "Votad por la persona que tiene peor dormir o ronca más duro; esa persona bebe.",
  "Votad por la persona que se viste mejor; esa persona bebe.",
  "La persona más joven de la mesa bebe.",
  "La persona mayor de la mesa bebe.",
  "La persona que tenga el cabello más largo bebe.",
  "La persona que tenga el cabello más corto bebe.",
  "La persona que esté vestida con más color rojo bebe.",
  "Todos los que tienen la batería del celular en menos del 20% beben.",
  "Todos los que usen Android beben.",
  "Todos los que hayan subido una historia a Instagram hoy beben.",
  "La persona con más seguidores en Instagram bebe.",
  "Todos los que hayan bloqueado a un ex en redes sociales beben.",
  "Todos los que tengan más de 3 alarmas puestas para levantarse beben.",
  "Todos los que tengan la pantalla del celular rota beben.",
  "Todos los que tengan al menos un tatuaje beben.",
  "Todos los que tengan piercings o perforaciones beben.",
  "Todos los que hayan ido al gimnasio esta semana beben.",
  "Todos los que usen reloj puestos en este momento beben.",
  "Todos los que tengan un perro como mascota beben.",
  "Todos los que tengan un gato como mascota beben.",
  "Todos los que fumen o usen vaper beben.",
  "Todos los que sepan hablar más de un idioma beben.",
  "Todos los que estén usando jeans o vaqueros beben.",
  "Todos los que traigan calcetines / medias beben.",
  "Todos los que hayan vivido en otra ciudad o país beben.",
  "Todos los que tengan licencia de conducir beben.",
  "Todos los que sepan tocar un instrumento musical beben.",
  "Todos los que hayan tenido un hueso roto alguna vez beben.",
  "Todos los solteros beben.",
  "Todos los que lleven más de 5 años con su pareja beben.",
  "Todos los que hayan vuelto alguna vez con un ex beben.",
  "Todos los que se hayan besado con alguien de esta mesa alguna vez beben.",
  "Todos los que hayan hecho trampa en un examen beben.",
  "Todos los que hayan mentido en su currículum o hoja de vida beben.",
  "Todos los que hayan tenido relaciones en un auto beben.",
  "Todos los que hayan salido a la calle sin ropa interior beben.",
  "Todos los que hayan nadado desnudos en el mar o en una piscina beben.",
  "Todos los que hayan robado algo de un hotel o restaurante (como una toalla o un vaso) beben.",
  "Todos los que tengan un juguete sexual en su casa beben.",
  "Todos los fieles beben.",
  "Todos los que tengan un hermano o hermana mayor beben.",
  "Todos los que sean hijo único beben.",
  "Todos los que se llamen con un nombre que empiece por vocal beben.",
  "Todos los que hayan nacido en un mes con la letra \"R\" (Enero, Febrero, Abril, Septiembre, Octubre, Noviembre, Diciembre) beben."
];
let juicio: string[] = DEFAULT_JUICIO;
export const getJuicio = () => juicio;
export function setJuicio(list: string[]) {
  juicio = list.length ? list : DEFAULT_JUICIO;
}
export const parseJuicio = (raw: unknown) => cleanList(raw, DEFAULT_JUICIO, 200);

/** Retos de ronda: un efecto que dura toda la ronda (no solo este turno); quien lo rompa bebe 1 vaso. */
export const DEFAULT_RONDA = [
  "Nadie puede decir «sí» ni «no».",
  "Nadie puede señalar con el dedo.",
  "Todos beben con la mano contraria a la que usan siempre.",
  "Nadie puede decir nombres propios: a todos se les llama «tú».",
  "Nadie puede reírse.",
  "Todos hablan en susurros.",
  "Nadie puede tocarse la cara.",
  "Nadie puede decir groserías.",
  "Todos hablan en tercera persona (por ejemplo: «Ana quiere un trago»).",
  "Cada vez que alguien beba, todos tienen que brindar.",
  "Prohibido usar el celular.",
  "Nadie puede cruzar los brazos ni las piernas.",
  "Todos tienen que terminar cada frase diciendo «¡salud!».",
  "Nadie puede decir la palabra «beber» ni «tomar»."
];
let ronda: string[] = DEFAULT_RONDA;
export const getRonda = () => ronda;
export function setRonda(list: string[]) {
  ronda = list.length ? list : DEFAULT_RONDA;
}
export const parseRonda = (raw: unknown) => cleanList(raw, DEFAULT_RONDA, 200);

/** Todas las listas editables juntas (así viajan entre el editor, el servidor y el juego). */
export type ContentLists = { categories: string[]; twisters: string[]; nicknames: string[]; nunca: string[]; juicio: string[]; ronda: string[] };
export const getLists = (): ContentLists => ({ categories, twisters, nicknames, nunca, juicio, ronda });
export function setLists(raw: Partial<Record<keyof ContentLists, unknown>> | null | undefined) {
  if (raw?.categories) setCategories(parseCategories(raw.categories));
  if (raw?.twisters) setTwisters(parseTwisters(raw.twisters));
  if (raw?.nicknames) setNicknames(parseNicknames(raw.nicknames));
  if (raw?.nunca) setNunca(parseNunca(raw.nunca));
  if (raw?.juicio) setJuicio(parseJuicio(raw.juicio));
  if (raw?.ronda) setRonda(parseRonda(raw.ronda));
}

export function pick<T>(list: T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length)];
}
