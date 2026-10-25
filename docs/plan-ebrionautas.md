# Plan: EBRIONAUTAS 👽🍷🎲

*Basado en el tablero "El Nuevo Ocalimocho".*

**Ebrionautas** es un juego de mesa virtual multijugador basado en el tablero de la
Oca para beber "El Nuevo Ocalimocho". Una pantalla grande (TV/portátil) muestra el tablero y
cada jugador se conecta desde su celular por URL/QR para tirar el dado, ver su
perfil, su ficha con accesorios y sus beneficios/penitencias activos.

> ⚠️ Este repo es el del Informe Digital de Unieduca. **Recomendación:** crear un
> repo nuevo (`ebrionautas`) y un proyecto Vercel aparte para no mezclar deploys.
> Este documento queda aquí solo como plan.

---

> **Cambio de rumbo (octubre 2026):** el juego se juega con **la TV + un solo
> celular de control**. El celular agrega a los participantes (nombre y
> hombre/mujer), tira los dados y decide; la TV muestra tablero y marcador.
> Las fichas son marcianos de colores. Quedan **cancelados por ahora**: el
> perfil por persona, la entrada de cada jugador con su celular, las
> votaciones por celular, los disfraces, accesorios, logros y cofres
> (secciones §2.3, §3.2–3.4 y Fase 5 de este plan).

---

## 0. Lore: extraterrestres borrachos 👽🍷

### 0.1 La historia
Hace años una nave de exploración interceptó por accidente la señal de una fiesta
humana (un video de cumpleaños con calimocho, karaoke y alguien bailando encima
de una mesa). El Consejo Galáctico lo analizó durante siglos y llegó a una
conclusión científica irrefutable: **la fiesta es el ritual sagrado más
importante de la humanidad**.

Los **Marcianos** (y otras especies de la galaxia) deciden imitarla para
"integrarse". El problema: **no entienden nada**. Creen que "beber a palo seco"
significa beber con un palo, que "ir de Oca en Oca" es una ruta de transporte y
que el calimocho es combustible para naves. Y el alcohol les afecta de formas
rarísimas.

El tablero es **la Gran Ruta de Bares Intergaláctica**: un recorrido en espiral
por 62 paradas del cosmos que termina en el **Planeta Tierra**, donde se celebra
la fiesta definitiva. Quien llega primero se convierte en **Leyenda Fiestera de
la Galaxia** (y se va a dormirla a su platillo).

### 0.2 Cómo afecta el alcohol a un Marciano (efectos visuales)
Según su **deuda de vasos / nivel de borrachera**, el Marciano cambia en
pantalla (sustituye a las expresiones de §3.1):

| Nivel | Estado | Efecto visual |
|---|---|---|
| 0 | Sobrio (aburrido) | Color normal, antenas rectas, cara seria de científico |
| 1 | Alegre | Mejillas que brillan, antenas que se mueven al ritmo |
| 2 | Contento | **Cambia de color** cada pocos segundos, eructa burbujas de colores |
| 3 | Pasado | Antenas enredadas en un nudo, **le sale un tercer ojo** que mira a otro lado |
| 4 | Muy pasado | Hipo que lo **teletransporta** unos píxeles, levita un poco, habla en idioma alien |
| 5 | Abducido | Se derrite como gelatina, ojos en espiral, un mini OVNI le da vueltas a la cabeza |

En la **Muerte (60)** se ve absorbido por un agujero negro; en la **Posada** se
pone gafas de sol y una sombrilla; al **ganar** lanza fuegos artificiales con
forma de planetas.

### 0.3 Tono y humor
- **Errores intergalácticos:** al caer en casillas, el narrador (el *Comandante
  Glorp*, voz en off en pantalla) explica la regla "humana" malinterpretada:
  *"Los humanos con gafas beben para ponerse más ciegos. Lógica impecable."*
- **Bebidas con nombre alien:** Calimocho de Plutón, Nebulosa Azul, Plasma con
  Limón, Chupito de Materia Oscura, Pola de Saturno, Guaro Gravitacional.
- **Moneda del juego:** en vez de "corchos", **Chapas Cósmicas** 🪙 (los aliens
  creen que las chapas de botella son dinero humano).
- **Rol estrella:** *Disfraz de Humano* — gafas con nariz y bigote, corbata y
  maletín. El Marciano cree que pasa desapercibido.

### 0.4 Las casillas en versión galáctica
Las **reglas son las mismas** del tablero original (§1); solo cambia el nombre,
la ilustración y el texto narrativo:

| Casilla original | Versión galáctica | Ilustración / gag |
|---|---|---|
| Salida (1) | **Plataforma de despegue** | El platillo arranca con un eructo |
| Oca (8, 18…, 58) | **Oca Espacial** | Una oca con casco que te lleva en su lomo a la siguiente. Frase: *"¡De Oca en Oca y bebo Calimocho!"* (se mantiene) |
| Posada (4, 20, 55) | **Estación de servicio Abstemia** | Gasolinera cósmica: aquí nadie te puede mandar beber |
| A beber (6, 14…, 59) | **Ronda de combustible** | Repartes vasos como quien reposta naves |
| Duelo de dados (7, 19…, 47) | **Duelo de dados láser** | Dos aliens con pistolas de dados |
| Laberinto (9, 35) | **Cinturón de asteroides** | Te pierdes entre rocas; sales con 5 o 6 |
| Reglas puñeteras (10, 23, 41) | **Ley del Consejo Galáctico** | Un juez alien con peluca dicta la norma |
| Zona cultural (13, 25…, 52) | **Examen de Humanología** | Preguntas sobre "costumbres humanas" |
| Hipnosis (17, 36, 57) | **Abducción mental** | Un rayo tractor te conecta al resto: bebes la mitad de sus deudas |
| Cárcel (26, 45) | **Calabozo de la Policía Intergaláctica** | Multa por "conducir platillo en estado de embriaguez" |
| Patinazo (43, 56) | **Resbalón en los anillos de Saturno** | Bebes de golpe o caes a la casilla indicada |
| Muerte (60) | **Agujero negro** | Te escupe en la plataforma de despegue |
| Meta (62) | **Planeta Tierra – La Fiesta Definitiva** | "¡Vete a dormirla… a tu platillo!" |
| Casillas de rasgos (2, 3, 5, 46…) | **Estudio de especímenes humanos** | El alien escanea a los jugadores reales: *"Detectados especímenes con tatuajes. Que beban 2 vasos."* |

### 0.5 Nombre del juego
**Nombre elegido: EBRIONAUTAS** (*ebrio* + *astronautas*).
- Cada jugador es **un Ebrionauta**; su perfil es la **Ficha de Ebrionauta**.
- Subtítulo opcional: *"Encuentros en la Tercera Copa"*.
- URL: `ebrionautas.vercel.app` (o dominio propio `ebrionautas.com` si está libre).
- Logo con el estilo de §5.1 (degradado amarillo→naranja / celeste→azul,
  contorno grueso, sombra sólida). La **"O"** de EBRIONAUTAS es un platillo
  volante con un vaso de calimocho derramándose, y el Marciano asoma por detrás
  de las letras con las antenas enredadas.

---

## 1. Reglas del juego (análisis del tablero)

### 1.1 Mecánica base
- Tablero de **62 casillas**. Se empieza en la **1 (SALIDA)**, se tira **1 dado**.
- Gana quien llega **exactamente** a la **62** ("¡Vete a dormirla!"). Si se pasa,
  rebota hacia atrás los puntos sobrantes (regla clásica de la Oca; configurable).
- Al ganar: "¡Has ganado! Ya tienes algo que contarle a tus nietos… **reparte el
  resto de bebida como prefieras**".
- Unidad de castigo: **vaso** (en modo suave = **sorbo**; ver §6).

### 1.2 Casillas especiales (leyenda)

| Tipo | Casillas | Regla | Implementación digital |
|---|---|---|---|
| **Posada del Abstemio** | 4, 20, 55 | No te pueden mandar beber durante este turno (una ronda). | Estado `INMUNE` hasta tu próximo turno. Cualquier reparto que te apunte se bloquea. |
| **¡A beber…!** | 6, 14, 22, 30, 49, 59 | Reparte los vasos señalados (x1, x2, x3, x4, x5, x6) entre quien quieras. | El celular abre un repartidor: N fichas de vaso para arrastrar/asignar a jugadores. |
| **Duelo de dados** | 7, 19, 29, 37, 47 | Reta a (x) jugadores (x1…x5), uno a uno; quien saque menos bebe. | Eliges rivales; a cada rival le aparece botón "Tirar" en su celular. Empate = se repite. |
| **Ocas** | 8, 18, 28, 38, 48, 58 | Saltas a la siguiente Oca y bebes 1 vaso diciendo *"De Oca en Oca y bebo Calimocho"*. | Animación de salto + deuda de 1 vaso + frase en pantalla. Desde la 58 no hay siguiente: te quedas (o configurable). Se vuelve a tirar (regla clásica, configurable). |
| **Laberinto** | 9, 35 | Te pierdes. Sales sacando 5 o 6. Bebes 1 vaso cada vez que fallas. | Estado `ATRAPADO_LABERINTO`. En tu turno tiras: 5–6 sales, si no +1 vaso. |
| **Reglas puñeteras** | 10, 23, 41 | Pones una norma que afecta a todos; dura hasta que alguien ponga otra. | Input de texto en tu celular → se muestra fija en el tablero ("Regla activa: …"). Botón "Denunciar infracción" que crea deuda de 1 vaso al infractor. |
| **Zona cultural (?)** | 13, 25, 33, 39, 52 | Haz una pregunta con varias respuestas (ej. "países de Europa"); se dicen en orden rápido; quien no sepa, bebe. | Modo A: el jugador escribe la categoría. Modo B: banco de categorías aleatorias. Temporizador de 5 s por turno en pantalla; el grupo marca quién falló. |
| **Hipnosis** | 17, 36, 57 | Durante un turno, ayudas al resto bebiendo la mitad de las deudas que adquieran. | Estado `HIPNOTIZADO` 1 ronda: cada deuda de otros se divide, la mitad (redondeo arriba) va a ti. |
| **Cárcel** | 26, 45 | Tira 2 dados y súmalos = vasos de "fianza". Solo sales cuando los bebas o caiga otro jugador. | Estado `EN_CARCEL` con fianza. Botón "Pagar fianza" o liberación automática si otro cae en la misma cárcel. |
| **Muerte** | 60 | ¡Qué mala suerte! Vuelve a la SALIDA (1). | Animación calavera + vuelta a 1. |
| **Patinazo** | 43 → 12, 56 → 31 | Para mantener el equilibrio bebes N vasos de golpe **o** vuelves a la casilla indicada. | Decisión en el celular: "Beber 4 de golpe" vs "Volver a la 12" (en la 56: 3 vasos o volver a la 31 — **validar texto**). |

### 1.3 Casillas con reto propio (las "de texto")

Muchas dependen de **rasgos del jugador**. Solución: el perfil guarda rasgos
(opcionales) y el juego aplica la casilla **automáticamente**; lo que no se puede
saber se resuelve con **confirmación del grupo** en los celulares.

| # | Nombre | Regla (del tablero) | Cómo se resuelve |
|---|---|---|---|
| 2 | Machos | Todos los hombres beben 1 vaso. | Rasgo `genero`. |
| 3 | Cegatos | Quien lleve gafas o lentillas bebe 1 vaso ("así se ponen más ciegos"). | Rasgo `gafas`. |
| 5 | Travoltas | Quien lleve melena o el pelo con gomina bebe 1 vaso. | Rasgo `melena_gomina` / cada uno marca "soy yo". |
| 11 | Hembras | Todas las mujeres beben 2 vasos. | Rasgo `genero`. |
| 12 | Pa' los de atrás | Beben 1 vaso todos los que estén por detrás tuyo. | Automático por posición. |
| 15 | Cómicos | Cuenta un chiste; si nadie se ríe bebes 2 vasos. | Votación en celulares "¿Hizo gracia?". |
| 16 | Pastosos | Quien lleve mucho dinero en la cartera bebe (vasos por cada X de más). | Cada uno se autodeclara (honor). Cifra adaptada a COP. |
| 21 | Impares | Nacidos en año impar beben. *(validar texto exacto)* | Rasgo `anio_nacimiento`. |
| 24 | Esclavos | Escoges un esclavo que bebe cuando tú bebas hasta que lo mandes / te liberen. *(validar)* | Estado `ESCLAVO_DE` (vínculo entre 2 jugadores): tus deudas se duplican al esclavo. |
| 27 | Meones | Quien haya ido al baño bebe 2 vasos. | Autodeclaración. |
| 31 | Pa' los de alante | Beben 1 vaso todos los que estén por delante tuyo. | Automático por posición. |
| 32 | Pares | Nacidos en año par beben 2 vasos. *(validar)* | Rasgo `anio_nacimiento`. |
| 34 | Guerra de sexos *(validar)* | Reto por equipos. | Votación. |
| 40 | "Corleone" | Quien tenga un pariente en la mesa bebe 3 vasos. | Al crear sala se pueden marcar "familia". |
| 42 | Tardones | Quien no tenga el vaso vacío se lo termina y bebe otro. | Autodeclaración. |
| 44 | Descuido | Quien no lleve condón encima bebe 1 vaso (por cada…). *(validar)* | Autodeclaración. |
| 46 | Tatuados | Quien lleve tatuaje o piercing bebe 2 vasos. | Rasgo `tatuaje_piercing`. |
| 50 | Escoceses | Si llevas ropa de cuadros, bebe 1 chupito de whisky. | Autodeclaración. |
| 51 | Musculitos | Quien vaya al gimnasio o haga deporte bebe 2 vasos. | Rasgo `deportista`. |
| 53 | Sedientos | Bebes lo que les queda a tus compañeros… *(validar)* | Autodeclaración. |
| 54 | Zoofílicos | Quien tenga mascota brinda en voz alta y bebe 1 vaso. | Rasgo `mascota`. |
| 61 | Lenguados | Recita un trabalenguas; quien no lo repita bien bebe 2 vasos. | Banco de trabalenguas + votación. |

> **Pendiente:** el texto de algunas casillas (21, 24, 34, 44, 53, 56) se ve
> pequeño/invertido en la imagen. Validarlo con el tablero físico antes de
> programar. Todas las casillas viven en un JSON editable (§4.3), así que
> cambiarlas no requiere tocar el motor.
>
> **Versión inclusiva (opcional):** 2/11/34 dependen de género. Ofrecer variante
> por configuración de sala (ej. "Machos" → "Los que tengan barba", "Hembras" →
> "Los que tengan el pelo largo") y que el rasgo `genero` sea opcional.

---

## 2. Experiencia de usuario

### 2.1 Dos pantallas
1. **Mesa / Tablero** (`/mesa/[codigo]`) — en TV o portátil. Muestra el tablero
   animado, fichas, dado gigante, carta de la casilla, reglas puñeteras activas,
   marcador de "vasos bebidos" y un **QR** para unirse.
2. **Control** (`/j/[codigo]`) — en el celular de cada jugador. Tirar dado,
   decisiones (repartir vasos, elegir rival, patinazo), votaciones, deudas
   pendientes ("¡Bebido!"), su perfil y ficha.

> También se puede jugar **solo con celulares** (sin pantalla grande): el
> tablero se ve en el celular en modo mini.

### 2.2 Flujo
1. Anfitrión entra a la web → "Crear mesa" → código de 4 letras (`KJ7Q`) + QR.
2. Jugadores escanean QR → **puerta de edad (+18)** → crean/recuperan su
   **Perfil de Borracho** → eligen ficha → "Listo".
3. Anfitrión pulsa "Empezar". Orden aleatorio (o todos tiran y el mayor empieza).
4. Turno: tu celular vibra → botón **TIRAR** (agitar el celular también tira).
5. El servidor resuelve la tirada → todos ven la animación → se aplica la casilla.
6. Si la casilla pide decisión, solo el celular implicado muestra la UI; el
   resto ve "Esperando a Pepe…".
7. Las deudas aparecen en el celular de cada uno; al beber pulsa "¡Bebido!"
   (honor system; el grupo puede "acusar").
8. Llega alguien a la 62 → pantalla de victoria, reparto final, premios y
   accesorios desbloqueados.

### 2.3 Perfil de Borracho (en el celular)
- **Ficha/avatar** con sus accesorios equipados.
- **Estado actual:** casilla, beneficios (🛡️ Posada, 🌀 Hipnosis activa…) y
  penitencias (🔒 Cárcel 7 vasos, 🌀 Laberinto, ⛓️ Esclavo de Ana, 📜 Regla
  puñetera, 🍷 Deuda: 3 vasos).
- **Estadísticas históricas:** partidas, victorias, vasos bebidos, vasos
  repartidos, duelos ganados, veces en la cárcel, muertes.
- **Título** dinámico: "Novato del Calimocho", "Rey de la Posada", "Preso
  reincidente", "Leyenda de la Oca"…
- **Rasgos** (opcionales, para casillas automáticas): gafas, tatuaje/piercing,
  mascota, deportista, año de nacimiento, melena, género.

---

## 3. Fichas y accesorios (la parte "cool")

### 3.1 Un solo personaje base: "el Marciano" 👽

En lugar de muchos personajes distintos hay **un único cuerpo muy básico** que se
viste de cualquier rol (referencia de estilo: hoja de personajes de Astrodraws,
solo como inspiración, no se copian sus diseños).

**Silueta base (siempre la misma):**
- Cuerpo en forma de **frijol/gomita**: más ancho abajo, cabeza y cuerpo son una
  sola pieza, sin cuello.
- **Bracitos cortos** pegados a los lados y **dos patitas** chatas abajo.
- Cara simple: **dos ojos** y **una boca** en la parte de arriba del frijol.
- Proporción ~1 : 1,25 (ancho : alto). Contorno oscuro grueso y brillo arriba,
  igual que la guía de UI (§5.1).

Como la silueta nunca cambia, **cualquier disfraz o accesorio encaja en
cualquier jugador** y solo hay que dibujar cada pieza una vez.

**Capas del SVG (de atrás hacia adelante):**
1. Sombra en el suelo
2. Aura / efecto trasero (llamas, burbujas, nube de mareo)
3. Patitas y bracitos
4. **Cuerpo** — color elegible (`fill: var(--skin)`) + textura opcional
   (manchas, escamas, rayas)
5. **Disfraz / rol** — se pone encima del cuerpo (vendas de momia, traje de
   tiburón, maceta de cactus…)
6. **Cara** — ojos + boca (intercambiables y con **expresiones**)
7. Accesorios de cabeza, ojos, boca, cuello
8. Objeto en la mano (vaso, dado, trofeo)

**Personalización básica (gratis desde el inicio):** color del cuerpo (12
colores), tipo de ojos (redondos, dormilones, espiral, cíclope, saltones),
boca (sonrisa, dientes, lengua fuera, "O" sorprendida) y patrón (liso, manchas,
rayas, escamas).

**Expresiones automáticas según el juego** (le da mucha vida):
- 😄 Feliz: en su turno / al ganar un duelo
- 😵‍💫 Mareado (ojos espiral + nube): con 5+ vasos de deuda o en Hipnosis
- 😢 Triste: en la Cárcel o el Laberinto
- 💀 Ojos en X: al caer en la Muerte (60)
- 😎 Chulo: en la Posada (inmune)
- 🏆 Eufórico + confeti: al llegar a la 62

### 3.2 Roles / disfraces del Marciano

Un **rol** es un disfraz completo que cambia toda la apariencia. Se desbloquean
jugando y muchos están ligados a casillas del tablero:

| Rol | Cómo se ve | Se desbloquea |
|---|---|---|
| 👽 Marciano | Base, antenas con bolitas y casco de cristal | Inicial |
| 🦆 La Oca | Pico naranja, plumitas, patas palmeadas | Caer en 3 Ocas en una partida |
| 🍷 Don Calimocho | Cuerpo de vino tinto, bigote, borde de copa en la cabeza | Beber 30 vasos (histórico) |
| 🍺 La Pola | Cuerpo dorado con espuma derramándose en la cabeza | Repartir 20 vasos |
| 🍋 Limón Tequilero | Cuerpo de limón, sombrero mariachi, sal en la cabeza | Ganar 3 duelos |
| 🔒 El Preso | Traje a rayas, bola con cadena | Ir 3 veces a la Cárcel |
| 💀 Calavera Mariachi | Cara de calavera, sombrero con flores | Caer en la Muerte y aun así ganar |
| 🌀 El Hipnotizador | Ojo único en espiral, capa morada | Absorber 5+ vasos en Hipnosis |
| 🧙 El Mago Puñetero | Sombrero de mago con estrellas, barba | Poner 3 reglas puñeteras |
| 🐂 Minotauro | Cuernos y hocico | Salir del laberinto al primer intento |
| 🧟 Zombi | Verde con costuras y tornillos | Volver a la salida 2 veces |
| 🏴‍☠️ Pirata | Sombrero con calavera, parche, garfio | Ganar 3 partidas |
| 🤡 Payaso | Nariz roja, pelo rizado, traje de rombos | Hacer reír en "Cómicos" (15) |
| 🦈 Tiburón | Traje de tiburón con dientes, bañador de flores | Evento especial |
| 🎃 Calabaza | Cuerpo naranja con hojas | Evento de Halloween |
| 🌵 Cactus | Maceta decorada, sombrero, florecita | Evento especial |
| 🧊 Yeti | Pelaje blanco y cuernos de hielo | Evento especial |
| 🦖 Dino | Cresta y dientes | Cofre |
| 🍦 Helado | Cono en la cabeza, cuerpo derretido | Cofre |
| 👑 El Campeón (mítico) | Cuerpo dorado brillante, corona, capa | Ganar 10 partidas |

Rol + color + accesorios = millones de combinaciones, aunque todos los jugadores
usen el mismo Marciano.

### 3.3 Slots de accesorios
`cabeza` (gorro, corona, sombrero vueltiao, casco vikingo) · `ojos` (gafas de
sol, gafas de corazón, parche pirata) · `boca` (bigote, puro, lengua fuera) ·
`cuello` (collar hawaiano, cadena de oro, corbata) · `mano` (jarra, maraca,
trofeo) · `aura/efecto` (llamas, burbujas, brillo dorado, nube de mareo) ·
`rastro` (huellas de vino que deja al moverse por el tablero).

Rareza: **Común / Raro / Épico / Legendario** (color del borde y brillo).

### 3.4 Cómo se ganan (logros → accesorio)

| Logro | Condición | Accesorio |
|---|---|---|
| Primera sangre | Jugar tu primera partida | Gorro de fiesta (común) |
| De Oca en Oca | Caer en 3 Ocas en una partida | Alas de oca (raro) |
| Fugitivo | Salir de la cárcel sin pagar fianza | Esposas rotas (raro) |
| Minotauro | Salir del laberinto al primer intento | Cuernos (raro) |
| Duelista | Ganar 5 duelos de dados (histórico) | Pistolas de vaquero (épico) |
| Resucitado | Caer en la Muerte y aun así ganar | Aura fantasma (legendario) |
| Generoso | Repartir 20 vasos (histórico) | Collar hawaiano (común) |
| Esponja | Beber 30 vasos (histórico) | Nube de mareo (épico) |
| Tirano | Poner 3 reglas puñeteras | Corona (épico) |
| Campeón | Ganar una partida | Trofeo en mano (raro) |
| Leyenda | Ganar 10 partidas | Brillo dorado (legendario) |
| Hipnotizador | Absorber 5+ vasos en una hipnosis | Gafas espirales (raro) |

Además, **cofre de fin de partida**: cada jugador recibe 1 accesorio aleatorio
(más probabilidad de raro para el ganador). Los accesorios se ganan **durante**
la partida (aparece un pop-up "¡Desbloqueaste Alas de Oca!") y se pueden equipar
en el momento.

---

## 4. Arquitectura técnica

### 4.1 Stack recomendado
| Pieza | Elección | Por qué |
|---|---|---|
| Frontend + API | **Next.js (App Router) + TypeScript** | Deploy nativo en Vercel, rutas `/mesa` y `/j`, API routes. |
| Estilos / animación | **Tailwind CSS + Motion (framer-motion)** | Ya los usas en el informe. |
| Tiempo real + BD | **Supabase** (Postgres + Realtime + Auth anónima + Storage) | Vercel **no mantiene WebSockets**; Supabase Realtime resuelve la sincronización. Plan gratis suficiente. |
| Avatares | **SVG por capas** (componentes React) | Combinar ficha + accesorios sin generar imágenes. |
| QR | `qrcode.react` | QR de la sala en el tablero. |
| Sonido / vibración | Howler.js + `navigator.vibrate` | Dado, Oca, muerte, victoria. |
| Tests | Vitest | El motor de reglas es lógica pura: muy testeable. |

Alternativas: **PartyKit/Cloudflare Durable Objects** (más "tiempo real puro",
pero otro proveedor), **Liveblocks** o **Ably/Pusher**. Supabase gana porque
además da BD para perfiles y accesorios persistentes.

### 4.2 Autoridad del servidor (anti-trampas)
- El **dado lo tira el servidor** (API route `/api/rooms/[code]/roll` o función
  Postgres), nunca el cliente.
- El estado del juego se calcula en el servidor con el **motor de reglas**
  (función pura `applyAction(state, action) → { state, events }`) y se guarda en
  `rooms.state` (JSONB). Supabase Realtime difunde el cambio a todos.
- Los clientes solo envían **intenciones** (`ROLL`, `DISTRIBUTE_DRINKS`,
  `CHOOSE_DUEL_TARGETS`, `PAY_BAIL`, `VOTE`, `SET_RULE`, `CONFIRM_DRANK`…).

### 4.3 Motor de reglas (núcleo)
```
src/game/
  board.ts          # las 62 casillas como datos (tipo, x, texto, destino)
  engine.ts         # applyAction(state, action) — máquina de estados pura
  effects.ts        # INMUNE, HIPNOTIZADO, EN_CARCEL, LABERINTO, ESCLAVO…
  drinks.ts         # cálculo de deudas (aplica posada, hipnosis, esclavo)
  achievements.ts   # logros evaluados sobre los events de la partida
  engine.test.ts
```
Ejemplo de definición de casilla:
```ts
{ n: 8,  type: 'OCA', next: 18 },
{ n: 14, type: 'A_BEBER', amount: 2 },
{ n: 19, type: 'DUELO', amount: 2 },
{ n: 26, type: 'CARCEL' },
{ n: 43, type: 'PATINAZO', drinks: 4, backTo: 12 },
{ n: 46, type: 'RASGO', trait: 'tatuaje_piercing', drinks: 2, title: 'Tatuados' },
{ n: 12, type: 'POSICION', who: 'detras', drinks: 1 },
```
**Fases del turno:** `WAITING_ROLL → MOVING → RESOLVING_TILE →
AWAITING_DECISION | AWAITING_VOTES | AWAITING_DUEL → NEXT_TURN` (+ `FINISHED`).

**Cálculo de deudas** (orden de aplicación): regla de la casilla → Posada
(bloquea si te reparten) → Esclavo (copia al esclavo) → Hipnosis (mitad al
hipnotizado) → se suma a `debt` del jugador.

### 4.4 Modelo de datos (Supabase)
```
profiles      id (auth uid), nickname, token_id, equipped (jsonb),
              traits (jsonb), stats (jsonb), created_at
unlocks       profile_id, item_id, unlocked_at, source
rooms         code (pk), host_id, status, settings (jsonb), state (jsonb),
              version (int, para concurrencia optimista), updated_at
room_players  room_code, profile_id, seat, is_connected
room_events   id, room_code, type, payload (jsonb), created_at  // historial/animaciones
items         id, slot, rarity, name, svg_key  (catálogo, o en código)
```
- **Login sin fricción:** auth anónima de Supabase; el perfil se guarda en el
  dispositivo. Opcional: vincular con Google/magic-link para no perderlo.
- **RLS:** cada jugador solo edita su perfil; `rooms.state` solo lo escribe el
  servidor (service role).
- **Reconexión:** si el celular se bloquea, al volver a `/j/KJ7Q` recupera su
  asiento por `profile_id`.

### 4.5 Ajustes de sala (anfitrión)
Modo de intensidad (vasos / sorbos / **sin alcohol** con retos y puntos),
rebote en la 62 sí/no, Oca vuelve a tirar sí/no, casillas de género
activadas/variante inclusiva, temporizador de zona cultural, máx. jugadores
(2–10), expulsar jugador.

---

## 5. Diseño visual
- Tablero **propio** inspirado en la espiral del original (62 casillas en
  espiral hacia el centro, colores por tipo de casilla como la leyenda: rojo
  `?`, amarillo "A beber", azul/blanco Ocas, verde laberinto, morado reglas).
- ⚠️ **No copiar el arte original** (es de QuinitoWeb / Pedro Soto): dibujar
  ilustraciones propias o generarlas, y usar el nombre como homenaje/uso privado.
- Tablero como **SVG** con coordenadas de cada casilla en `board.ts` → las fichas
  se mueven casilla a casilla con Motion.
- Celular: botones enormes, modo oscuro, vibración en tu turno, confeti al ganar.

### 5.1 Guía de estilo de la interfaz (referencia: kit de UI tipo "Gear Fight")

La interfaz (sobre todo el celular y el perfil) sigue el estilo de los **juegos
móviles casuales**: cartoon, colores saturados, todo con volumen y contorno
oscuro. Nada de UI plana tipo app de oficina.

**Principios**
- **Volumen "chunky":** cada botón, tarjeta e icono tiene un **contorno oscuro**
  (azul marino `#1b1f4b`), un **bisel inferior** (sombra sólida de 4–6 px del
  mismo tono más oscuro) y un **brillo** arriba (franja blanca al 25 %).
  Al pulsar, el botón "se hunde": baja 4 px y desaparece el bisel.
- **Esquinas redondeadas generosas** (14–20 px) y ligera inclinación (−2°) en
  títulos especiales.
- **Iconos ilustrados**, no de línea: cofres, vasos, dados, fichas… con el mismo
  contorno y brillo.

**Botones por color = significado (igual que en la referencia)**

| Color | Uso en el Ocalimocho | Ejemplos |
|---|---|---|
| 🔵 Azul `#2f7bf5` | Info, ayuda, reglas, opciones | "Reglas", "ⓘ", "Ver casilla" |
| 🟢 Verde `#5cd23c` | Acción principal / confirmar | **TIRAR**, "¡Bebido!", "Listo", "Equipar", "Reclamar" |
| 🟡 Amarillo `#ffc61a` | Secundario / volver / menú | "Volver", "Repetir", "Menú" |
| 🔴 Rojo `#e8344a` | Cancelar, salir, rechazar, penitencia | "Salir", "✕", "Pagar fianza" |
| ⚪ Gris `#8a9bb5` | Bloqueado / inactivo / no es tu turno | Accesorios sin desbloquear 🔒 |
| 🟣 Magenta rayado `#e53fd6` | Especial / legendario / premio | Cofre legendario, "Campeón", eventos |

**Tipografía**
- **Títulos grandes:** fuente display gruesa (*Lilita One* o *Luckiest Guy*,
  Google Fonts), en mayúsculas, con **degradado** (amarillo→naranja o
  celeste→azul), **contorno grueso** oscuro y sombra sólida desplazada.
  Ej.: el logo **"OCALIMOCHO"** al estilo del logo "GEAR FIGHT" (con un vaso o
  un dado en lugar de la espada).
- **Títulos especiales** (eventos de casilla) inclinados y en naranja/amarillo
  como "MISSION COMPLETED": **"¡DE OCA EN OCA!"**, **"¡A LA CÁRCEL!"**,
  **"¡PATINAZO!"**, **"¡VETE A DORMIRLA!"**, **"¡DUELO!"**.
- **Texto normal:** *Fredoka* o *Nunito* bold, blanco con contorno fino sobre
  fondos de color, o azul marino sobre fondos claros.

**Barra inferior del celular (5 iconos ilustrados, el central más grande)**
`Tienda/Cofres` · `Logros` · **`JUGAR` (dados cruzados, centro)** · `Fichas`
(abanico de cartas) · `Perfil`.

**"Monedas" y contadores (pastillas oscuras con icono a la izquierda)**
- 🍷 **Vasos bebidos** (como el corazón "10")
- 💀 **Muertes** (como la calavera "3")
- 🪙 **Chapas Cósmicas** — moneda del juego que se gana jugando y sirve para abrir cofres.
- ⭐ **XP / nivel de borracho** — barra de progreso amarilla con insignia de
  nivel (estilo "LEVEL 2 · 200/325").
- 🎲 **Casilla actual** — barra tipo "WAVE 8/10" → **"CASILLA 34/62"**.

**Cofres = rarezas de accesorios** (como la fila "CHESTS")
Madera (común) → Hierro (raro) → Bronce/engranaje (épico) → Morado cristal
(legendario) → Dorado con gema (mítico). Animación de apertura con brillo y
cartas que salen volando. Versión **mini** para el pop-up de "desbloqueaste".

**Tarjetas de ficha** (como la carta del goblin)
Carta vertical con color de fondo por rareza, nivel en la esquina, estrellas
(1–4) según accesorios equipados y "PODER" = vasos repartidos. Las fichas
bloqueadas se muestran como carta oscura con candado.

**Insignias de casilla** (como "BOSS" y "MISSIONS")
Cada tipo de casilla tiene un emblema circular dentado con su icono: Oca, Posada,
Cárcel, Laberinto, Hipnosis, Zona cultural (?), Duelo, Regla puñetera, Muerte.
Se usan en la leyenda, en la carta de casilla y en el perfil (beneficios /
penitencias activos).

**Implementación (tokens CSS / Tailwind v4)**
```css
@theme {
  --color-ink: #1b1f4b;           /* contorno y biseles */
  --color-btn-blue: #2f7bf5;
  --color-btn-green: #5cd23c;
  --color-btn-yellow: #ffc61a;
  --color-btn-red: #e8344a;
  --color-btn-grey: #8a9bb5;
  --color-btn-special: #e53fd6;
  --font-display: "Lilita One", system-ui;
  --font-body: "Fredoka", system-ui;
}
.btn-game {
  border: 3px solid var(--color-ink);
  border-radius: 16px;
  box-shadow: inset 0 -6px 0 rgb(0 0 0 / .25),   /* bisel inferior */
              inset 0 4px 0 rgb(255 255 255 / .35), /* brillo */
              0 4px 0 var(--color-ink);             /* volumen */
  font-family: var(--font-display);
  text-shadow: 0 2px 0 var(--color-ink);
  transition: transform .08s;
}
.btn-game:active { transform: translateY(4px); box-shadow: inset 0 -2px 0 rgb(0 0 0 / .25); }
```
Componentes React a crear: `<GameButton color>`, `<GameTitle variant="big|special">`,
`<CounterPill icon value>`, `<ProgressBar level>`, `<ChestIcon rarity>`,
`<TokenCard>`, `<TileBadge type>`, `<BottomNav>`.

**Assets:** los iconos/cofres/fichas se encargan a un ilustrador o se generan
con IA en este mismo estilo y se exportan como **SVG** (o PNG @2x con fondo
transparente). No usar los assets de "Gear Fight": solo es referencia de estilo.

---

## 6. Juego responsable
- Puerta **+18** al entrar (como el aviso del tablero original).
- **Modo sorbo** y **modo sin alcohol** (los vasos se convierten en puntos/retos;
  gana también quien tenga menos puntos).
- Botón **"Me planto"**: un jugador puede pasar a modo sin alcohol en mitad de la
  partida sin salir.
- Aviso discreto si alguien acumula muchos vasos en poco tiempo.

---

## 7. Fases de desarrollo

| Fase | Contenido | Estimación |
|---|---|---|
| **0. Setup** | Repo nuevo, Next.js + Tailwind, proyecto Supabase, deploy vacío en Vercel, variables de entorno. | 0,5 día |
| **1. Motor de reglas** | `board.ts` con las 62 casillas, `engine.ts` con todas las reglas, tests unitarios de cada tipo de casilla. Jugable en local (hot-seat, una sola pantalla). | 3–4 días |
| **2. Multijugador** | Salas con código + QR, unirse desde celular, tirada en servidor, Realtime, reconexión, vista Mesa vs Control. | 3–4 días |
| **3. Interacciones** | Repartir vasos, duelos, votaciones, patinazo, reglas puñeteras, zona cultural, deudas "¡Bebido!". | 3 días |
| **4. Perfil + Marciano** | Perfil persistente, rasgos, Marciano base en SVG por capas con colores/ojos/bocas/expresiones, primeros 6 roles, editor de accesorios, estadísticas. | 3–4 días |
| **5. Logros y cofres** | Sistema de logros, desbloqueos en partida, cofre final, rarezas. | 2 días |
| **6. Pulido** | Tablero ilustrado, animaciones, sonidos, vibración, modos de intensidad, puerta +18, PWA (instalable). | 3 días |
| **7. Prueba real** | Partida con amigos, ajustar textos de casillas y balance. | — |

**MVP jugable (fases 0–3): ~2 semanas.** Versión completa: ~3–4 semanas.

---

## 8. Decisiones pendientes
1. ¿Repo/proyecto Vercel nuevo? (recomendado)
2. Confirmar texto exacto de las casillas 21, 24, 34, 44, 53, 56.
3. ¿Casillas de género tal cual o variante inclusiva por defecto?
4. ¿Perfil solo anónimo (por dispositivo) o con login para conservarlo siempre?
5. ¿Pantalla grande obligatoria o también modo "solo celulares"?
6. Estilo de arte de las fichas (cartoon tipo el tablero, pixel art, 3D-ish…).
