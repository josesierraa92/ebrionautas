# CLAUDE.md

**Muertos de Sed** (antes "Ebrionautas"): juego de mesa virtual para beber (tablero tipo Oca) con tema de
Día de Muertos: los muertos tienen una sola noche al año para salir de fiesta y deben volver a su tumba antes
de que salga el sol. Lema: "Una noche para beber. Toda la eternidad para dormirla." Plan original en
`docs/plan-ebrionautas.md` (escrito con el tema anterior de extraterrestres; las mecánicas siguen valiendo).

## ⚠️ REGLA IMPORTANTE: todo cambio debe verse en el juego Y en el editor

El usuario edita textos, reglas y tablero desde el editor (`/admin/editor`) y le preocupa que lo nuevo solo exista en el juego. **Al cambiar
cualquier regla, texto, título, número o pantalla, comprueba SIEMPRE las dos partes** y dile al usuario qué verificaste en cada una:
1. **Textos y diseño de las tarjetas** (`src/game/cards.ts`). La vista previa del editor usa el **mismo componente `GameCard`** que el juego
   (TV y celular): si rediseñas la tarjeta, el editor cambia solo; no vuelvas a dibujar una copia aparte en `CardsDialog`.
   El texto y los huecos: el texto/título de serie y sus huecos `{x}` (con su explicación en `vars`) tienen que
   reflejar la regla nueva. El editor «📝 Tarjetas» (`CardsDialog.tsx`) lista ese catálogo y su vista previa usa `sampleVars` (datos de
   ejemplo: añade ahí los que falten, p. ej. `giftAmount`, `category`). Una tarjeta o resultado nuevo (p. ej. «Duelo: resultado») debe estar
   en `cardCatalog()` / `RESULT_KEYS` para que se pueda editar.
2. **Textos guardados antes**: lo que el admin ya guardó en Redis (`cards:custom`) manda sobre el de serie. Si cambias un texto de serie,
   **añade el viejo a `LEGACY` en `cards.ts`** (se ignora si coincide exactamente) o el editor seguirá enseñando el texto antiguo.
3. **Listas editables** (categorías de La Ouija: `cards:categories`) y cualquier dato nuevo configurable: se muestran en el editor y se
   guardan con «💾 Guardar» (`/api/admin/cards`).
4. Títulos grandes, paneles de decisión y tarjetas de la TV y del celular deben salir de `cardTitle`/`tileRule`, nunca de texto escrito a
   mano; lo que aún no se puede editar (frases de los paneles del celular, «¡X PIERDE Y BEBE!») hay que decírselo al usuario.
5. Tras cambiar reglas, ejecuta `npx vitest run` (los tests del catálogo y de textos viejos están en `rules.test.ts`) y revisa el editor
   (`/admin/editor` → «📝 Tarjetas») con una captura si es un cambio visible.

- Stack: Next.js 15 (App Router, `src/`), TypeScript, Tailwind CSS v4.
- Comandos: `npm run dev`, `npm run lint`, `npm test` (vitest), `npm run build`.
- `src/game/board.ts`: las 62 casillas como datos. Las reglas viven en datos,
  el motor en `src/game/engine.ts` es una función pura `applyAction(state, action, rng)` con tests en `engine.test.ts`. La partida local (Fase 1) está en `src/app/jugar/`.
- Estilo UI: tokens y clases `.btn-game` / `.title-game` en
  `src/app/globals.css` (guía en el plan §5.1).
- Textos en español. Deploy: push a `main` → Vercel (https://ebrionautas.vercel.app/).

## Modo de juego actual: TV + un solo celular de control

- `/mesa/[code]`: la TV crea la mesa, muestra un QR y luego el tablero y el marcador. Solo muestra.
- `/c/[code]`: el único celular que controla la mesa (el primero que la reclama; la TV puede
  liberarlo con "cambiar de celular"). Agrega a los muertos/jugadores (nombre + hombre/mujer), tira y decide.
  En partida solo enseña un dado gigante (`src/components/DiceController.tsx`) que se tira tocándolo o
  agitando el celular (`src/lib/useShake.ts`; en iPhone pide permiso de movimiento) y de quién es el turno
  (el usuario quitó el "Siguiente: nombre" de debajo del dado). Marcador, historial y tablero van en "☰ MARCADOR".
- Inicio (`src/app/page.tsx`): la portada `public/art/portada.webp` (ya trae el logo «Muertos de Sed»; la dio el
  usuario). En horizontal (TV) ocupa toda la pantalla y los tres accesos van abajo en una fila (`HomeActions`); en
  vertical (celular) va arriba a todo el ancho y los botones debajo.
- `/jugar`: sin TV, todo en una misma pantalla (partida guardada en localStorage).
- El género resuelve solas las casillas Machos (2) y Hembras (11); el resto de casillas de
  "quién bebe" las marca el control.
- Fichas: **personajes zombi** del kit **Mini Characters de Kenney** (CC0; `public/personajes/`, copiados con
  `node scripts/characters/zombify.mjs <carpeta GLB del kit>`). 6 hombres para los hombres y 6 mujeres para las
  mujeres, por orden de entrada (`characterOf` en `src/game/characters.ts`); con más de 6 de un género se repiten (se
  distinguen por el nombre; el aro de color y el brillo de la casilla se quitaron a petición del usuario). Del tamaño
  de un zombi de la decoración (`CHARACTER_HEIGHT`) por el tamaño elegido en el editor (`characterSize` del layout,
  «🧟 Fichas», con vista previa sobre una casilla; se publica como `characterScale`). Respiran (`.zb-breathe`, con
  `transform` en una capa y el espejo en otra: la propiedad `scale` no existe en navegadores de TV antiguos). La piel verde se pinta al dibujarlos (`SKIN` en `src/editor/characterSheet.ts`: solo la
  franja de piel de cada uno, porque en otros es pelo o ropa) y los ojos son amarillos (`yellowEyes`: piezas oscuras y
  planas de la cara, que comparten color con el pelo negro y por eso se cambian en la geometría). En la TV son
  sprites de una hoja (`renderCharacterSheet`: cada personaje de frente y de espaldas, quieto y en dos pasos de
  "walk"; las otras dos direcciones, en espejo) y miran hacia donde van (`spriteOf`: hacia abajo de la pantalla = de
  frente, hacia arriba = de espaldas). La hoja de serie (`public/art/zombis.webp`, `STOCK_SHEET`) se hace con
  `node scripts/characters/sheet.mjs` (dev en marcha); al publicar, el editor dibuja otra con el ángulo de
  `tvView` y la sube a Blob (`PublishedBoard.characters`). Los retratos del marcador, tarjetas, celular y ganador
  usan la misma hoja (`Marciano` con `character`). Las fichas propias del editor («🧟 Fichas») siguen mandando.
  No hay pantalla para personalizarlos: perfiles, accesorios a elegir y votación por celular se quitaron a
  propósito; no reintroducirlos sin que lo pida. A la mujer «a» se le quitan las muletas que trae el kit (`PROPS`).
- El servidor es la autoridad: `src/server/rooms.ts` guarda la mesa, ejecuta el motor
  (dados incluidos) y solo acepta jugadas con la clave del control. API en `src/app/api/rooms/`.
  Los clientes consultan la mesa cada 1 s (`src/lib/room-client.ts`) y solo aceptan versiones nuevas.
- Almacén: Upstash Redis por REST (`src/server/store.ts`), con las variables
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` o `KV_REST_API_URL`/`KV_REST_API_TOKEN`.
  Sin ellas, en desarrollo usa memoria (las mesas se pierden al reiniciar).

## Tablero isométrico, animaciones y sonido

- **Tablero en 3D en vivo** (lo principal ahora; el usuario veía la imagen "borrosa" y lenta de cargar frente al
  editor): si hay diseño publicado (`PublishedBoard.live`, el diseño se guarda al publicar y lo da
  `GET /api/board/layout`), `IsoBoard` monta `LiveBoard` (`src/components/LiveBoard.tsx` + `src/live/liveBoard.ts`): el
  mismo motor del editor (`EditorScene` con `{ viewer: true }`: sin herramientas, cámara de `tvView` que sigue con
  suavidad a la ficha, sombras del escenario congeladas tras `ready()`) dibuja el tablero a la resolución real de la
  pantalla, y los jugadores son los zombis 3D (`loadAll` de `characterSheet.ts`, clonados con SkeletonUtils) con sus
  animaciones `idle` (respira) y `walk`, girando hacia donde van, con un saltito por casilla, arco en los vuelos, luz
  propia suave y el nombre en HTML encima. Mientras carga se ve la imagen; si no hay WebGL o no llega a ~24 fps, se
  queda la imagen (y esa TV lo recuerda: `localStorage` `ebrio:tablero` = `imagen`; `?imagen` lo fuerza y `?3d`
  quita la comprobación de velocidad, para pruebas). La comprobación de velocidad espera 3 s de calentamiento (se compilan
  shaders), mide en dos ventanas de 4 s (<18 fps en las dos) y no mide con la pestaña oculta; si falla, esa TV se queda
  en imagen solo 30 min (`ebrio:tablero-imagen`). Caminar/quieto con histéresis de 0,3 s (`still`) para no parpadear
  entre pasos seguidos.
- Respaldo: **tablero isométrico en imagen** (`IsoBoard`): una imagen 3D pre-renderizada (ver abajo) con las fichas
  encima.
- Cámara: la imagen del tablero se pinta una vez ya acercada (tamaño final) y la cámara solo la desplaza con
  `translate3d` (la tarjeta gráfica, sin repintar); las fichas son capas HTML aparte que también se mueven con
  transform. No animar el `viewBox` (repintaba la imagen enorme en cada fotograma: todo iba lento) ni escalar con CSS
  (borroso). El tablero está siempre con zoom (`ZOOM` en `IsoBoard`) y sigue a la última ficha que tiró (`focus` de
  `useGameFx`; antes de la primera tirada, al jugador de turno). El usuario no quiere que se aleje. Animaciones
  tranquilas y fluidas (antes eran "súper rápidas"): `STEP_MS` 340 ms por casilla, `FLY_MS` 750, dado 700 y títulos
  1600 ms en `useGameFx`; `IsoBoard` usa los mismos tiempos en sus transiciones y la cámara tarda 1,1 s. Cada losa lleva su número de pie en el borde delantero.
- `src/game/isoPath.ts`: recorrido de las 62 casillas (camino serpenteante estilo Mario Party, `ROUTE`) y la proyección. `src/components/BoardStage.tsx`
  pinta encima el dado y los títulos (`src/components/Fx.tsx`).
- **Estética única** (pedido del usuario: "que todo tenga la misma estética", nada de "pedazos de muchos juegos"):
  todo sale del mismo render 3D, con la misma luz, materiales y paleta. **Antes de tocar el tablero, usar la skill
  `diseno-tablero`** (`.claude/skills/diseno-tablero/SKILL.md`): estilo terror/postapocalíptico (no Día de
  Muertos ni Halloween), recorrido serpenteante de casillas redondas al estilo Mario Party (`ROUTE` en
  `isoPath.ts`), zonas, escala y la lista de revisión. `decor.test.ts` comprueba que nada pise ni tape casillas.
- `scripts/board3d/scene.ts` (Three.js) construye la escena con código y `node scripts/board3d/render.mjs` la renderiza
  en Chromium sin pantalla (WebGL por software) a `public/art/board.webp` (tablero), `public/art/alien/<i>.webp`
  (calaverita por color de `PLAYER_COLORS`) y `public/art/<tipo>.webp` (losa de cada tipo, para tarjetas y títulos).
  Volver a ejecutarlo tras cambiar casillas, decoración (`src/game/decor.ts`) o colores. La cámara usa la misma
  proyección que la TV (`isoSx`/`isoSy`/`ISO_VIEW` en `src/game/isoPath.ts`), así que `IsoBoard` pone la imagen de
  fondo y encima solo las fichas y los números. La TV no necesita WebGL.
- La decoración usa modelos profesionales del **Graveyard Kit de Kenney** (CC0, www.kenney.nl) guardados en
  `scripts/board3d/models/graveyard/` (solo los que se usan, con su `License.txt`): pinos, lápidas, cruces, velas,
  altar, cripta, tumba, rejas de hierro, faroles. `kenney(nombre, alto)` en `scene.ts` los carga y escala; para
  añadir otro, copiar su `.glb` del kit (se descarga de kenney.nl/assets/graveyard-kit) y sumarlo a `KENNEY`. Lo
  procedural que queda (cempasúchil, pétalos, mezcal, papel picado, lago, la tumba meta y las calaveritas) va en
  low poly / mismo estilo. El repo "Claude Code Game Studios" se evaluó y no aplica (es organización de trabajo
  para Godot/Unity, no trae arte).
- Se probó generar dibujos con IA (Cloudflare Workers AI) y el usuario lo rechazó por incoherente; no volver a mezclar.
- `src/lib/useGameFx.ts`: a partir de los cambios de estado anima el dado (`rollSeq`), el paso a paso de
  la ficha, vuelos (Oca, agujero negro…), títulos grandes y dispara los sonidos (`src/lib/sfx.ts`, Web Audio
  sintetizado, sin archivos).
- TV: con "SOLO TABLERO" el marcador se oculta y el tablero ocupa toda la pantalla (se recuerda en esa TV);
  hay botón de pantalla completa. En una esquina, `TurnChip` muestra el turno y quién sacó cuánto en el dado.
- Cada casilla donde cae alguien saca una tarjeta pequeña en la esquina inferior derecha (`RuleCard` en
  `src/components/TvCards.tsx`; lo principal es que se vea el tablero). En el celular la misma tarjeta
  (`PhoneRuleCard`, contenido compartido en `cardContent`) sale solo cuando hay que decidir algo, encima de las
  opciones; la pantalla del dado queda limpia (cambio del usuario). Con
  su regla explicada (`src/game/rules.ts`). Se queda hasta la siguiente tirada (para que dé tiempo a leerla);
  si hay que decidir, además dice qué marcar en el celular. Al tirar perdido en el Panteón en Niebla sale el resultado
  (`mazeOutcome`: con 5 o 6 "¡Se salvó!", si no "¡Sigue perdido!" y bebe).
- **Tarjetas editables** («📝 Tarjetas» en el editor, `CardsDialog.tsx`): cada tarjeta distinta (una por clase de casilla;
  en Machos/Cegatos…, retos y posiciones, una por título; más las de resultado de niebla y purgatorio) con su título y
  texto. `src/game/cards.ts` es el catálogo (`cardCatalog`, `cardKeyOf`) con los textos de serie y huecos `{nombre}`,
  `{vasos}`… que rellena `tileRule` (`rules.ts`); lo que cambia el admin se guarda aparte del tablero en Redis
  (`cards:custom`, `GET /api/cards`, `PUT /api/admin/cards`) y la TV y el celular lo cargan con `useCardTexts` al
  abrir. En las decisiones de retos/exámenes (`decisionRule` en `TvCards`) se usa el texto propio y se le añade lo que
  sale al azar (categoría, trabalenguas). La TV: el chip de turno solo muestra quién juega (sin el dado: el dado
  grande ya se ve) y la tarjeta no repite el nombre; los botones de arriba son iconos discretos (`.icon-btn`).
- Títulos grandes de la TV (`BannerOverlay` en `Fx.tsx`; rediseñado a petición del usuario: los iconos en imagen
  se veían borrosos, no quería los discos ni el resplandor blanco, y le faltaba personalidad): una franja oscura
  ladeada con filetes del color del evento, el icono de la casilla en vector (`iconMaskUrl(name, 512)`, del color del
  evento y con contorno), «CASILLA N» y el título en Creepster (`--font-spooky`, `.banner-title`) con sombra dura de
  color; entra con `banner-slam`. El tamaño de letra baja con títulos largos. Sin discos, sin resplandor.
- Tarjetas de regla (TV y celular, `GameCard.tsx`; rediseño a petición del usuario para que combinen con el juego y
  tengan personalidad): panel oscuro con el color de la casilla como acento (`TILE_ACCENT`), icono de la casilla en
  vector, «CASILLA N», título en Creepster (`.banner-title`), texto en la letra del juego y pastilla del color con lo
  que toca hacer en el celular. Se mide en `--u` (1cqw en la TV, 14px en el celular).
- Purgatorio (cárcel; regla del usuario): en su turno el preso tira; con 1-3 **debe** 2 vasos, con 4-6 debe 4 (`jailBail`) y elige en el celular
  cuántos paga ya (decisión `JAIL_PAY` `{ owed, roll }`, acción `{ type: "JAIL_PAY", n }`, panel `JailPay` en `DecisionPanel`). Si paga todo,
  sale y vuelve a tirar para avanzar (`extraRoll`); si paga menos **queda debiendo el resto** (`status.carcel.debt`) y pasa el turno. En su
  siguiente turno ya no tira: el motor le abre `JAIL_PAY` con `roll: null` por la deuda, y así hasta pagarla (el marcador enseña «debe N»).
  Cada pago deja `GameState.lastJail { seq, by, paid, left }`: la TV y el celular enseñan la tarjeta «¡Queda debiendo!» (`jailOwes`) o «¡Sale del
  Purgatorio!» (`jail`, «pagó su penitencia») y un título grande (`jailPaidOutcome` en `rules.ts`, `useGameFx`, `DiceController`). Mientras elige,
  la tarjeta (`jailPayCard`: «¡A pagar penitencia!» `jailRoll` o «Deuda del Purgatorio» `jailDebt`) sale de `cardContent`. Las 4 tarjetas del
  Purgatorio son editables en «📝 Tarjetas» → Resultados; el texto viejo de la casilla y de «sale» está en `LEGACY`. No hay opción de esperar.
- Toda casilla que diga "tira el dado" debe enseñar después una tarjeta con lo que pasó (TV y celular):
  niebla (`mazeOutcome`), purgatorio (`jailOutcome`) y duelo (`lastDuel` en el estado + `duelOutcome`).
- Nombres de las casillas (`TILE_NAMES` en `board.ts`): Medianoche (salida), Tu Tumba (meta), El Murciélago (oca:
  "¡De murciélago en murciélago y bebo porque me toca!"), La Fosa (vuelve a la 1), Purgatorio (cárcel), Panteón en Niebla
  (laberinto), Poseído, La Ouija, La Capilla (posada), Pacto de Sangre (esclavo), Ley del Más Allá, Ronda de mezcal,
  Duelo de calaveras, Tropiezo con la lápida, Juicio de los vivos. Nada de extraterrestres, naves ni patos.
- El menú del celular usa el tablero 2D en espiral (`src/components/Board.tsx`, `src/game/spiral.ts`).

## Editor del tablero (`/admin/editor`, en construcción por fases)

El usuario quiere diseñar él mismo el tablero, como en Los Sims o Photoshop, en lugar de que lo componga Claude.
- Fase 1 (hecha): terreno de celdas que se pinta (`GROUNDS`) y se sube/baja/aplana, catálogo de modelos para
  arrastrar o "sellar", gizmos de mover/girar/tamaño, deshacer, 4 luces, guardar en la nube y exportar/importar.
- Fase 2 (hecha): herramienta "Casillas del juego" (T) para poner las 62 casillas en celdas (`tiles` del
  layout; el tipo de cada número sigue siendo el de `board.ts`), color e icono por tipo (`tileStyles`: emoji o
  imagen subida, guardada como data URL pequeña) y botón "Publicar en la TV": `renderForTV()` en `scene.ts`
  renderiza todo con la cámara de la TV y calcula el píxel de cada casilla; `POST /api/admin/publish` sube la
  imagen a **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`; en desarrollo sin Blob va al almacén y la sirve
  `/api/board/image`) y guarda `PublishedBoard` (`src/game/publishedBoard.ts`) en Redis. `IsoBoard` usa el
  tablero publicado (`usePublishedBoard`, `GET /api/board`) y, si no hay, el de serie (`scripts/board3d`).
  La TV lo lee al cargar la página. `DELETE /api/admin/publish` vuelve al de serie.
- Casillas de 2×2 celdas (`TILE_SIZE`; el usuario las quiere grandes). Estilo por tipo (`kind`): "vivid" (colores
  de videojuego verde/amarillo/morado, por defecto en las importantes: `VIVID` en `layout.ts`) o "road" (asfalto
  con el icono pintado, para que no chillen con el escenario).
- El terreno sigue más allá del borde del mundo (copia de la celda del borde) y la foto de la TV es 16:9 y llena
  la pantalla: el usuario no quiere ver "un cubo flotando en el infinito" ni cielo alrededor.
- Estética de las casillas (pedido del usuario): números con la fuente del juego (Lilita One, `--font-lilita`), líneas
  casi invisibles y esquinas/cantos redondeados (`RoundedBoxGeometry`), sin marcos cuadrados. Los iconos son siluetas
  de un solo tono con temática de terror, dibujadas con rutas en `src/editor/icons.ts` (se guardan como `i:<nombre>`;
  también se puede subir una imagen). La mariposa se cambió por un murciélago.
- Ajustes de los números (`numbers` del layout, iguales para las 62): mostrar/ocultar, tamaño, tipo de letra
  (`NUMBER_FONTS`; las extra se cargan en `src/editor/fonts.ts` con next/font, que no admite `...` en las opciones)
  y posición (abajo/arriba/izquierda/derecha/centro, tal como se ve en pantalla). El color del icono y del número es
  el mismo y se elige por tipo (`iconColor`).
- Fase 3 (hecha): **modelos propios** y **fichas**. «⬆ Subir modelo (.glb)» (catálogo, pestaña «Mis modelos»):
  `modelUpload.ts` dibuja la miniatura, calcula la escala (lado mayor ≈ 2 casillas), sube el .glb directo a Vercel Blob
  (`/api/admin/models/upload`, `handleUpload`; sin Blob, en desarrollo, `PUT /api/admin/models/dev` lo guarda en el
  almacén) y lo apunta en Redis (`src/server/customModels.ts`, `GET /api/models`). Los ids son `mios/<nombre>-xxxx`.
  «🧟 Fichas» (`TokensDialog.tsx`): `tokens` del layout, un `TokenSpec` (modelo, giro, tamaño en la TV, peana del color
  del jugador) por cada color de `PLAYER_COLORS`; al publicar, `modelRender.ts` dibuja cada ficha con la cámara de la
  TV (imagen 252×408, pies abajo) y se suben a Blob (`tokens` y `tokenScale` de `PublishedBoard`). La TV las lee con
  `useTokenArt` (`usePublishedBoard.ts`), que usa `Marciano`; `IsoBoard` aplica `tokenScale`. Las fichas sin cambiar
  siguen siendo el zombi de serie.
- **Vista de la TV** (`tvView` del layout: `az`/`el` en grados y `tiles` = casillas a lo ancho al seguir una ficha; de
  serie 45°/45°/6, más cenital y cerca que la isométrica, pedido del usuario). «🎥 Usar esta vista en la TV» copia el
  ángulo y el acercamiento de la cámara del editor (`currentView`); «📺 Vista TV» la enseña (`resetView(true)`). También se ajusta a mano con los controles «Zoom TV» (casillas a lo ancho) y «Ángulo» de la barra de arriba. Las
  fichas propias se dibujan con ese mismo ángulo (`renderToken(..., view)`).
- Calidad en la TV (el usuario la vio "borrosa" frente al editor, que dibuja a la densidad real de la pantalla):
  `renderForTV(true)` encuadra solo las casillas + 5 de margen y saca el tablero en **mosaicos** de 2048 px a la
  resolución que hace falta para que la TV acercada se vea 1:1 en 3840 píxeles físicos (TV 4K o pantalla con escala de
  200 %), hasta 8192 px (ya es solo el respaldo del 3D en vivo). Se pintan por trozos con `setViewOffset`; cada mosaico se sube aparte directo a Blob
  (`/api/admin/publish/upload`) y se publica en `PublishedBoard.chunks`; `image` es entonces una versión de 2400 px
  que se ve mientras cargan. `IsoBoard` coloca los mosaicos (solapados 1 px, sin costuras) y el navegador solo
  descodifica los que se ven. Los zombis también van a doble resolución (hoja de 384×576 por dibujo). Sin Blob
  (desarrollo) cae a una sola imagen de 2400 px dentro de la petición (≤ ~3,3 MB). `PublishedBoard.zoom` le dice a
  `IsoBoard` cuánto acercar. En desarrollo el editor deja la escena en `window.__editorScene` y
  `window.__renderCharacterSheet` para pruebas con Playwright.
- Hasta **16 jugadores** (`PLAYER_COLORS` en `tileStyle.ts`: cada color tiene su imagen `public/art/alien/<i>.webp` con
  un accesorio distinto, `LOOKS` en `scripts/board3d/scene.ts`; el editor tiene una ficha por color). Para más,
  añadir colores y accesorios y volver a correr `node scripts/board3d/render.mjs` (restaurar con git los archivos que
  no sean `alien/` si cambian). Con más de 4 en una casilla, `IsoBoard` los pone en cuadrícula y más chicos.
- Editor: selección múltiple (recuadro arrastrando en vacío, Mayús/Ctrl + clic, Ctrl+A) con un pivote que mueve y gira
  el grupo (`startMulti`/`onMultiChange` en `scene.ts`). Girar con 🧲 Ajustar = flechas ↺ ↻ de 90° como en Los Sims
  (`rotateSelection`, HTML que la escena coloca sobre la selección); sin Ajustar = anillo libre. Mundo ampliable por
  cada lado (`expand` en `layout.ts`, botones ↖ ↗ ↙ ↘ de 8 casillas; máximo `MAX_SIZE` = 96) sin mover lo construido.
- Datos: `src/editor/layout.ts` (formato `BoardLayout`, funciones puras con tests), `history.ts` (deshacer),
  `scene.ts` (Three.js: dibuja el diseño y recoge el ratón), `BoardEditor.tsx` (la interfaz).
- Se guarda en Redis (`src/server/boardDesign.ts`, API `src/app/api/admin/board`). Guardar pide la clave
  `ADMIN_PASSWORD` (variable de entorno de Vercel); en desarrollo, sin ella, no se pide. El borrador se guarda
  también en el navegador.
- Luces de los objetos (`light` en `PlacedObject`, panel `ObjectLightPanel`): un foco (`SpotLight`) más un halo por
  cada lámpara del modelo (un farol doble tiene dos; `findLamp` las agrupa en `anchors`). Los que se llaman lantern/candle/jackolantern/lightpost/fire/torch/campfire/brazier brillan solos
  (`isEmitter`, `lightOf`); `light: {on:false}` los apaga. Sin luz propia la noche queda muy oscura (pedido del usuario).
  La luz sale de los cuadritos amarillos del modelo (`src/editor/lamp.ts` los detecta por el color de la textura,
  255,192,68 en Kenney) y esas partes brillan con un mapa emisivo; es un foco hacia abajo, no un punto, para no
  encender el poste del farol. Neblina (`mist` del layout, 1 por defecto = opaca a ~3 casillas de la línea amarilla, con degradado suave en el borde): tres láminas bajas que tapan el terreno de relleno de fuera
  de la línea amarilla (pedido del usuario: esa zona "despoblada" se veía mal).
- Catálogo: kits CC0 de Kenney en `public/models/<kit>/` (cementerio, naturaleza, supervivencia, ciudad) y el kit
  **Halloween Bits de KayKit** (CC0, `halloween`, escala 0.5: viene ~4 veces más grande). Poly Pizza bloquea las
  descargas automáticas (Cloudflare): los kits se bajan de su repositorio (p. ej. GitHub) y los `.gltf` se
  convierten con `node scripts/editor/gltf2glb.mjs <carpeta> public/models/<kit>`.
  `node scripts/editor/catalog.mjs` genera `public/models/catalog.json` y las miniaturas; volver a ejecutarlo al
  añadir modelos. Ahí también va la escala con la que entra cada kit (`KITS`).

- Ley del Más Allá: la ley se dicta **en voz alta** (pedido del usuario); no se escribe ni hay barra «Ley vigente». El
  celular solo toca «YA LA DICTÉ» (`SET_RULE` sin texto, `rule.text` queda vacío) y `rule` solo sirve para mostrar el +1 de penalización.
- Tipografía (pedido del usuario): todo el juego usa **Lilita One** (`--font-sans` y `--font-display` apuntan a `--font-lilita`; Fredoka ya
  no es la letra base) con `font-synthesis: none` (solo tiene un peso: sin negrita falsa). Los nombres sobre las fichas (`.live-name`
  en 3D y el respaldo de `IsoBoard`) van siempre en MAYÚSCULAS. Los títulos grandes siguen en Creepster.
- Espaciado entre letras: `-0.01em` en todo el juego (`body` en `globals.css`, nombres de fichas y `.banner-title`); solo se dejan anchos a propósito los rótulos pequeños («CASILLA N», el código de mesa).
- `TurnChip` (esquina de la TV, rediseño a petición del usuario: "no parece de videojuego pro"): placa de HUD hecha en CSS, sin imágenes
  de IA (ya se rechazaron por incoherentes): retrato enmarcado con el color del jugador, placa morado oscuro (`#2d1460`, borde `#1a0b38`) ladeada, «Turno de» en texto morado,
  nombre en mayúsculas con sombra dura azul muy oscuro (sin filete de color abajo).
- **Modo TV ligero** (el 3D en vivo iba injugable en la TV real: dado y fichas bloqueados). En el visor (`EditorScene` con `viewer`):
  30 fps fijos (`VIEWER_FPS`), ancho interno máximo de 1920 px (`VIEWER_MAX_W`: una TV 4K lo escala sola) con **resolución dinámica**
  (`resScale`, baja hasta 0,75 si no llega a 24 fps y vuelve a subir), sombras PCF de 2048, solo **4 focos reales** (`VIEWER_LIGHTS`) que se reparten entre los faroles más cercanos a la cámara con fundido suave (`collectViewerLamps`/`updateViewerLights`; el charco de luz pintado se quitó: se veía como un disco amarillo con bordes naranja), `mergeStatic()` junta el escenario fijo en pocas mallas por
  material y por trozo de 24 celdas (de ~400 dibujos a unos 70) y `compileAsync` precompila los shaders. El editor y la foto de la TV no
  cambian (siguen con focos y 4096). Medido en Chromium por software con el tablero real: 0,4 fps → 5 fps (≈10× más rápido). La
  comprobación de velocidad de `LiveBoard` empieza a los 6 s.
  `?debug` en la dirección de la TV enseña fps, resolución y dibujos.
- **Títulos grandes = título de la tarjeta**: el banner de cada casilla (`showEvent` en `useGameFx`) usa `tileRule(...).title`, así que si el admin
  cambia el título en «📝 Tarjetas» cambia también el del centro de la pantalla (los de niebla/purgatorio usan el título de su tarjeta de
  resultado). `EVENTS` solo aporta icono, color y sonido (y el título de respaldo).
- **Duelo manual** (pedido del usuario): al elegir rivales (`DUEL`) pasa a la decisión `DUEL_ROLL`; el celular tira cada dado a mano, primero
  quien reta y luego su rival (`DUEL_ROLL` en el motor; `DuelRoll` en `DecisionPanel`), con empate se repite y con varios rivales se juega una
  ronda por rival. Cada tirada sube `rollSeq` y `lastRoller` (la TV anima el dado con el nombre de quien tira: `DiceFx.by`). La tarjeta del
  duelo se queda en la TV y el celular explicando qué hacer; al final sale la de resultados (`lastDuel`).
- Celular, flujo de turno (pedido del usuario): tras la tirada (y al llegar el turno) se ve **solo la tarjeta de la casilla a pantalla completa**
  (`PhoneRuleCard` con `unit="19px"`) y abajo el botón «SIGUIENTE TURNO ▶»; al tocarlo sale «Le toca a …» con el dado en medio
  (`DiceController`, estado `dismissed` por clave de tarjeta; no se puede tirar con la tarjeta abierta). Cuando hay que decidir, la tarjeta
  va encima de las opciones, como antes.
- Nombres sobre las fichas (`.live-name`, en 3D y en el respaldo de `IsoBoard`): **en el color del jugador** (variable `--c`) con contorno azul muy oscuro (`#090b2a`,
  0,34em) y debajo una **flechita blanca** (`::after`) que señala al personaje (pedido del usuario; antes al revés: nombre blanco y flecha de color). Más pequeños: `tilePx * 0.088` (mín. 10 px) en 3D, antes `0.11` (mín. 12 px), y 9/10,5/13 px en el respaldo de imagen, antes 11/13/16.
  La pantalla de la tarjeta lleva arriba «Turno de NOMBRE» con su avatar (de quién es la tarjeta).
- Cámara y cuadro de turno de la TV (pedido del usuario): siguen a quien jugó hasta que el celular toca **«SIGUIENTE TURNO»**; entonces la cámara va
  a quien tiene el turno y el `TurnChip` cambia. El motor lo marca con `GameState.waiting` (`true` en `endTurn`, `false` con la acción
  `NEXT_TURN` o al tirar). Si la tarjeta ya se vio junto a una decisión, el celular manda `NEXT_TURN` solo al resolverla (`DiceController`).

- **Trago de regalo** (casillas A_BEBER, antes «Ronda de mezcal»): reparte de **1 a 3 vasos al azar** (`giftAmount` en el estado; el número de
  la casilla ya no cuenta). Todos los títulos de la pantalla (banner de la casilla, panel de la TV y del celular) salen de la tarjeta
  (`cardTitle(key)` / `tileRule`), y `useGameFx` carga los textos propios al arrancar para que el primer título grande ya sea el editado.
- Celular, decisiones: la tarjeta y las opciones van en **una sola pantalla** (tarjeta arriba, cómo repartir/elegir abajo); al terminar la decisión no se vuelve a enseñar la tarjeta (`dismissed`), pasa directo al siguiente turno.
- **La Ouija: categorías** (pedido del usuario): al caer sale una al azar (`GameState.category`) y la tarjeta la enseña con el hueco
  `{categoria}` (si un texto propio viejo no lo lleva, `tileRule` añade «Categoría: …»). La lista es editable en «📝 Tarjetas» (cuadro
  «🔮 Categorías de La Ouija», una por línea) y se guarda en Redis (`cards:categories`, `src/server/lists.ts`; `GET /api/cards`
  la devuelve en `categories` y `PUT /api/admin/cards` la guarda). El motor lee `getCategories()` (`game/content.ts`); el servidor la carga
  antes de cada `ROLL`/`DUEL_ROLL` (`actInRoom`) y la TV/celular al abrir (`useCardTexts`). De serie: `DEFAULT_CATEGORIES`.
- **Murciélago (OCA) con decisión** (pedido del usuario): al caer sale la decisión `OCA` (`{ next }`): en el celular «SÍ, BEBO Y VUELO A LA N» (bebe 1,
  vuela al siguiente murciélago y vuelve a tirar) o «NO, ME PLANTO» (se queda y pasa el turno); en el último murciélago (`next: null`) «sí»
  solo bebe y vuelve a tirar. Acción `{ type: "OCA", choice: "fly" | "stay" }`. El texto de la tarjeta usa `{destino}` («volar hasta la casilla 18 y
  volver a tirar»); un texto propio viejo de esta tarjeta hay que revisarlo en «📝 Tarjetas».
- Duelo: al terminar sale un título grande en la TV con quién pierde y bebe («¡JOSE PIERDE Y BEBE!», `useGameFx`) y después la tarjeta de
  resultado. El trago de regalo nunca enseña más de 3 vasos en la tarjeta (`Math.min(3, …)`). Tras «Siguiente turno» el celular no vuelve a
  enseñar el dado girando (`spin` en `DiceController`: solo gira si lo que se envía es una tirada).
- Trago de regalo: el título de serie ahora es «Trago de regalo» (antes «¡Ronda de mezcal!», que queda en `LEGACY`); `TILE_NAMES.A_BEBER` también.
- Duelo de calaveras: la tarjeta dice «reta hasta a N» con N = mínimo entre el número de la casilla y los rivales que hay en la mesa (`tileVars`), igual que el motor; con 2 jugadores siempre «1 rival». La vista previa del editor usa 3 jugadores de ejemplo (2 rivales como máximo).
- La tarjeta «Resultado del duelo» (TV y celular) lleva el icono vectorial de su casilla (`tileIcon` en `Landed.result`), no un emoji propio.
- Celular (pedido del usuario): con la tarjeta arriba, los paneles de decisión (`DecisionPanel` con `compact`) NO repiten la explicación de la regla; solo muestran lo que hay que hacer (botones, rivales, cuántos vasos quedan). Sin `compact` (`/jugar`, que no tiene tarjeta) sí llevan título y texto.
- Celular, pantalla de decisión: la tarjeta va centrada en el espacio libre (`unit="18px"`) y las opciones **abajo, al alcance del pulgar**, para que no quede un hueco vacío bajo los botones (`DiceController`).
- **Calidad según el aparato** (`src/editor/quality.ts`, pedido del usuario: luces distintas en PC y en TV para el rendimiento): `viewerQuality()` detecta por el
  navegador — Smart TV/Android TV/Fire TV/consolas → **baja** (2 focos, 30 fps, 1920 px); móvil o PC modesto (≤4 núcleos/≤4 GB) → **media** (4 focos,
  30 fps, 1920 px); PC → **alta** (6 focos, 60 fps, 2560 px, sombras suaves de 4096). Se fuerza con `?calidad=alta|media|baja`; `?debug` enseña el nivel.
  Encima, la resolución dinámica baja sola si no llega al 80 % de los fps objetivo. La detección por navegador no es infalible (una Smart TV con un
  navegador que se hace pasar por PC saldría «alta»): si pasa, abrir la TV con `?calidad=baja`.
- `GameCard` (TV, celular y vista previa del editor): arriba icono + «CASILLA N · NOMBRE» en una fila y el título **debajo, a todo el ancho**, con tamaño según su longitud (`titleSize`) para que no pase de 2 renglones (`text-wrap: balance`); antes el título quedaba en una columna estrecha y se partía en 4 renglones.
- Botones de respuesta del celular (`DecisionPanel`): solo texto, sin emojis (pedido del usuario).
- Icono de beber (pedido del usuario): en lugar de la copa 🍷 se usa `BeerIcon` (botella de cerveza en contorno blanco con etiqueta cuadrada y una X): contador de tragos del marcador, «SIGUE PERDIDO: BEBE 1» y tarjetas de resultado (`GameCard` convierte el emoji 🍷). Los iconos van siempre solo en contorno, sin relleno.
- **Tropiezo de lápida** (pedido del usuario; antes «Tropiezo con la lápida»): siempre **2 vasos** seguidos (casillas 43 y 56, `drinks: 2` en `board.ts`) o rueda a la casilla de cada una (43 → 12, 56 → 31). La tarjeta, el botón del celular y el motor usan el mismo número; los textos viejos con «3»/«4 vasos» quedan en `LEGACY`.
  Los 2 vasos salen de la constante `PATINAZO_DRINKS` (`board.ts`), no del número guardado en la decisión: una partida en curso con una decisión vieja (con 4) también enseña y cobra 2. Regla general: **la UI y el motor no deben fiarse de números guardados dentro de decisiones antiguas**; si cambias una regla numérica, usa una constante.
- Editor «📝 Tarjetas» ordenado por **grupos** (`CARD_GROUPS`/`groupOf` en `cards.ts`: Juicio de los vivos, Retos, Casillas con decisión, Estados y castigos, Inicio y meta, Resultados), con resumen arriba (casillas y tarjetas por grupo, saltan al grupo) y en cada tarjeta una etiqueta «Se repite ×N» o «Solo 1 casilla» y el subtipo (Rasgo/Posición/Reto). Un tipo de casilla nuevo debe añadirse a un grupo (hay test).
- Editor «📝 Tarjetas» (pedido del usuario, versión final): se edita **el mismo texto del juego**. Lo que siempre vale lo mismo en esa tarjeta
  (`staticCardVars` en `rules.ts`: «1 vaso», «los hombres», «2 vasos») se enseña ya escrito como texto normal; lo que cambia en cada partida o según
  la casilla (`{nombre}`, `{casilla}`, `{lista}`, `{rivales}`, `{categoria}`…) **se queda entre llaves** para no romper la lógica (se probó quitarlas
  del todo con datos de ejemplo y el usuario pidió volver a ponerlas donde hacen falta). Al añadir un hueco, decide si es fijo (igual en todas las
  casillas de la tarjeta) o va en `DYNAMIC_VARS`. El último murciélago (casilla 58) tiene su propia tarjeta (`OCA:ultimo`) porque no vuela a ninguna casilla.
- **Diseño de la tarjeta** (`GameCard`, maqueta del usuario y sus ajustes): panel **cuadrado con esquinas levemente redondeadas**, del **mismo morado
  del cuadro de turno** (`#34187a`→`#2d1460`→`#220e4d`) con **borde grueso** (`#4a2a94` + filo `#1a0b38`); acento **verde biche** con degradado a verde
  oscuro (`GREEN`, `#a3e635`→`#3f8f1c`) igual en TODAS las tarjetas (ya no usan el color de cada casilla): pastilla «CASILLA N» arriba en el centro,
  **cuadro redondeado** (no hexágono) con el icono oscuro a la izquierda y flechita a la derecha. Título en **Lilita One** en mayúsculas (`titleSize`,
  máx. 2 renglones), texto en **Nunito Sans 700** (`--font-nunito`, `layout.tsx`) color `#d8d4f6`, y botón morado con dado blanco para lo que toca
  hacer en el celular.
- `GameCard`: el icono va centrado y grande (74 %) en su cuadro, el verde es más neón (`#b6ff3b`→`#2fd11a`) y el dado del botón del celular enseña lo que sacó (`dice` = `game.lastRoll`, `DiceIcon`). El hueco `{destino}` sigue funcionando en `tileVars` por si hay un texto propio guardado con él.
- `GameCard`: el número de la pastilla «CASILLA 48» va en blanco con un filo oscuro (`Kicker`) y la palabra con el color de la pastilla; el icono ocupa el 98 % del cuadro (el murciélago se veía chico).
- `GameCard`: el cuadro verde del icono y la pastilla «CASILLA N» van **sin borde** (pedido del usuario).
- `GameCard`: sin el aro negro alrededor de toda la tarjeta (solo queda el borde morado grueso) y todo el texto de la pastilla «CASILLA N», número incluido, en oscuro (el blanco se probó y el usuario pidió volver al negro).
- `GameCard` colores finales (el usuario comparó la tarjeta de la TV con la del celular y prefirió el aspecto del celular): verde `#bffa58`→`#5fc34a` y morado `#2f1768`→`#29155a`→`#210f4d` con borde `#452b8e`, medidos de su captura del celular. TV y celular usan el mismo componente: si se ven distintos es por la pantalla (una TV o un monitor sRGB satura más el verde que un iPhone) o por una página con la versión vieja en caché.
- `GameCard`: el cuadro verde del icono tiene ancho y alto explícitos e iguales (4 `--u`), sin `aspect-ratio` ni `height:100%` (el Safari del iPhone lo estiraba y no quedaba cuadrado).
- **La TV se actualiza sola** (`src/lib/useAutoUpdate.ts`, `GET /api/version`, `NEXT_PUBLIC_BUILD_ID` en `next.config.ts`): la TV se queda horas con la página abierta y seguía con la versión vieja (diseño azul de antes). Cada 45 s compara su versión con la publicada (commit de Vercel) y recarga cuando no hay dado ni jugada en marcha. En desarrollo no hace nada. Solo la TV (`/mesa`); el celular se recarga a mano.
- Al abrir la TV con el 3D publicado ya **no se enseña la imagen mientras carga** (tenía otro encuadre y los personajes quietos: parecía que el tablero se congelaba y hacía zoom al pasar al 3D). Se ve «Cargando el tablero…» y, si el 3D tarda más de 15 s, la imagen mientras tanto (`IsoBoard`, `slow`). Además `LiveBoard.start` precompila los shaders de las fichas (`EditorScene.precompile`) antes de enseñar el tablero: el primer dibujo de los zombis congelaba la TV un momento.
- Nombres sobre las fichas en 3D: se colocan en `placeLabels` (`LiveBoard`) **después** de mover la cámara y dibujar (`EditorScene.onAfterFrame`). Antes se colocaban con la cámara del fotograma anterior y, mientras la cámara se desplazaba, el nombre se alejaba del personaje y luego volvía.
- Respiración de los zombis en 3D: la animación `idle` del kit apenas mueve los brazos y en la TV no se veía. `LiveBoard.frame` añade una respiración propia (el modelo se estira y encoge ~3,5 % en alto, ~2,6 s por ciclo, fase al azar por personaje) que se apaga suave al caminar o volar (`base`/`breath`/`amp` del token).
- Comprobación de velocidad del 3D (`LiveBoard`): solo en los primeros ~30 s (6 ventanas de 4 s tras 6 s de calentamiento), no toda la partida. Si falla, esa carga pasa a imagen, pero la TV solo se queda en imagen 30 min (`ebrio:tablero-imagen`) si falla **dos cargas seguidas** (`ebrio:tablero-lento`; una carga que va bien lo borra). Antes, una racha lenta tras un F5 dejaba cada recarga en imagen: personajes quietos, otro encuadre, «se congela».
- Retratos (`Marciano`): sin el círculo amarillo translúcido detrás del ganador («euforico»): sobre el fondo oscuro del marco se veía como una bola gris detrás del personaje (el usuario pidió quitarla).
- Luz de velas y objetos bajos (`applyObjectLight` en `scene.ts`): el foco se **sube hasta ~1,3 sobre la base del modelo** (`lift`; el halo se queda en la llama). Con el foco pegado a la llama quedaba una mancha amarilla de borde duro sobre la losa y casi nada de luz alrededor (queja del usuario con `halloween/plaque_candles`); subido, reparte un charco suave. Los faroles altos no cambian (`lift` = 0). Se afecta igual a la TV (`collectViewerLamps` lee la posición del foco).
- **Títulos de las tarjetas** (`GameCard.titleSize`): el tamaño cabe la **palabra más larga** (una palabra no se parte: «PURGATORIO» se salía de la tarjeta del celular) y el título entero en 2 renglones; ancho útil ~8,6 `--u`, letra ~0,52 de su tamaño. Comprobado en el editor: ningún `h3` de las 51 tarjetas tiene `scrollWidth > clientWidth`.
- **Clasificatoria** (`src/components/Clasificatoria.tsx`, pedido del usuario): al ganar, el celular tiene el botón «VER CLASIFICATORIA» (`ranking` en `c/[code]/page.tsx`) que abre un cuadro grande al centro con el diseño de las tarjetas (panel morado, pastilla y cuadros verde biche) con todos los jugadores ordenados por tragos (`drunk`), el ganador marcado con 🏆 y una barra por jugador. El estado es compartido: el botón manda `{ type: "RANKING", on }` y el motor guarda `GameState.ranking` (solo con la partida terminada); mientras está abierto, el celular y la TV/PC (`mesa/[code]/page.tsx`, a pantalla completa y con `unit="min(1.7vw, 2.6vh)"`) enseñan la clasificatoria **en lugar** del mensaje de ganador (sin confeti); «CERRAR» en el celular la quita de los dos y vuelve el mensaje.
- Halo de las luces (`sprite` en `applyObjectLight`): `depthTest: false`. El halo es una imagen que mira siempre a la cámara y el suelo la cortaba en una **línea recta horizontal** (banda oscura debajo de las velas, queja del usuario). Para encontrar cosas así: un corte recto horizontal en pantalla suele ser un sprite o plano de cara a la cámara cortado por la profundidad.
- Las tarjetas de resultado (niebla «¡Se salvó!»/«¡Sigue perdido!», purgatorio, duelo) llevan **siempre el icono vectorial negro de su casilla** (`tileIcon: true` en `Landed.result`: laberinto, cárcel, duelo), nunca un emoji (pedido del usuario: «los iconos son negros»). En el editor lo toma `resultTile` de `CardsDialog`. Una tarjeta de resultado nueva debe llevar `tileIcon: true` y su casilla en `resultTile`.
- **Trago de regalo** quedó en solo **3 casillas** (6, 30, 59; pedido del usuario). Las otras tres (14, 22, 49) pasaron a retos nuevos: **Chorizo** (14: «Desde ahora tu nombre es Chorizo; si alguien se equivoca, toma 1 vaso»), **Borrachín** (22: todos beben un trago salvo el más ebrio, que eligen entre todos) y **Muero de sed** (49: licor en la mano del jugador de la derecha y se bebe como un perrito). Son `RETO` normales (`board.ts`): en el celular se marcan quiénes beben (`SELECT_DRINKERS`) y sus tarjetas salen solas en «📝 Tarjetas» → Retos del Más Allá (`RETO:<título>`). El `amount` de A_BEBER ya no se usa (los vasos son 1-3 al azar).
- `TurnChip`: el fondo del retrato es un **degradado RADIAL de morado oscuro**: claro en el centro y oscuro hacia afuera (`radial-gradient #5a31ad → #3a1d7a → #1a0b38`; el usuario lo quiere radial, no lineal, y más oscuro que el primero `#8a58e0 → #4a2a94 → #2d1460`), ya no azulado con el color del jugador (el marco sí sigue con su color); El texto «Turno de» y el nombre vuelve a su sitio de antes (`pl-9`; el corrimiento a la derecha `pl-12` no gustó).
- **Botella low poly** (pedido del usuario; forma final = su dibujo, **redonda**): `node scripts/editor/botella.mjs` la genera con código en `public/models/juego/botella.glb`: giro de 16 lados con cuerpo ancho y recto (la mitad de la altura), hombros cortos, cuello largo (un poco más ancho que al principio: radio 0,108) y delgado, collarín, tapa (corcho) baja y pequeña marrón y etiqueta alta (más alta que ancha, un cuarto de vuelta) con una X negra; vidrio verde, colores planos y sombreado suave (484 triángulos). Está en el catálogo del editor como kit «Del juego» (`juego`, escala 0,8 en `KITS` de `catalog.mjs`; la miniatura y `catalog.json` se añadieron sin regenerar los demás). Historial: una versión de cuello fino y curvas suaves «parecía de vino» y otra en estilo **voxel** (cajas) tampoco gustó: el usuario quiere redonda pero con la silueta de su dibujo.
- `TurnChip`: los bordes tienen **grosor uniforme** (pedido del usuario): sin sombras sólidas desplazadas hacia abajo (`0 5px 0` / `0 6px 0`), que engrosaban el borde de abajo; solo queda el anillo parejo y una sombra difuminada.
- `TurnChip`: «TURNO DE» (1rem) y el nombre (2,6rem) solo un poquito más grandes que el original (14 px y 2,25rem); una subida mayor (lg / 3,25rem) fue demasiado.
- `TurnChip`: la placa ya **no va ladeada**, sus lados son verticales (pedido del usuario; antes `-skew-x-6`).
- `TurnChip`: «TURNO DE» sube 1 px (16 px) y todo el texto se corre 3 px a la derecha (`pl-[39px]`), pedido del usuario.
- `TurnChip`: la placa se recortó a la derecha (`pr-[26px]`: ~30 px de aire después del nombre, antes 28 px más un hueco de ~30), pedido del usuario.
- `TurnChip`: «TURNO DE» bajó 1 px más (`top-[4px]`), pedido del usuario.
- `TurnChip`: con **degradados** (pedido del usuario): el anillo de color del jugador es un `linear-gradient(150deg)` del mismo color más claro → color → más oscuro (`shadeHex`, un contenedor de 5 px de relleno en lugar de `box-shadow`, que no admite degradados) y «TURNO DE» lleva el verde en degradado de texto (`#e3ff9a → #bffa58 → #5fc34a`, `background-clip: text`).
- `TurnChip`: la sombra del nombre es más corta (`0 2px 0, 0 3px 0` #1a0b38; antes 3 y 5 px), pedido del usuario.
- `TurnChip`: el texto se corrió 4 px más a la derecha (`pl-[43px]`), pedido del usuario.
- Degradados del `TurnChip` (pedido del usuario): del **color vivo y fuerte (neón) a un tono más normal y oscuro**, sin pasar por un claro: anillo `color +12 % → color → color −38 %` y «TURNO DE» `#c6ff4a → #8be02c → #3f9a2a`.
- `TurnChip`: el borde interno del retrato (dentro del anillo de color) es un **morado oscuro** `#1b0a40` (antes `#26105a`; primero se probó un morado casi negro `#0c0420`, el usuario prefirió el morado oscuro), no el azul oscuro `ink` (se veía «azulito»; pedido del usuario).
- `TurnChip`: el degradado de «TURNO DE» es **horizontal** (`90deg`: neón a la izquierda → verde oscuro a la derecha), pedido del usuario.
- `TurnChip`: el texto se corrió otros 4 px a la derecha (`pl-[47px]`), pedido del usuario.
- `TurnChip`: «TURNO DE» vuelve a ser **verde neón liso** `#bffa58`, sin degradado (el usuario probó el degradado y prefirió quitarlo; el anillo del retrato sí conserva el suyo).
- `TurnChip` (pedido del usuario: «la misma estética»): la **placa** lleva exactamente los colores de la tarjeta de casilla (`GameCard`): fondo en degradado `#2f1768 → #29155a → #210f4d` y borde de 5 px en el morado más claro `#452b8e` (esquinas `rounded-2xl`); antes borde `#1a0b38` y fondo plano `#2d1460`. Si cambian los colores de `GameCard`, cambiarlos aquí también.
- `TurnChip`: la placa es **más baja que el cuadro del personaje** (`py-1`, ~80 px contra ~94 px del retrato con su anillo; antes `py-2`), pedido del usuario.
- Nombres sobre las fichas, versión actual (pedido del usuario): el **nombre en blanco, sin contorno de letra**, sobre una **burbuja redondeada negra al 50 % de transparencia** (`.live-name::before`: `rgba(0,0,0,.5)`, `border-radius: 999px`, `z-index: -1`; funciona porque `will-change: transform` crea contexto de apilado) y debajo de la burbuja la **flechita del color del jugador** (`--c`), sin borde oscuro y con un **resplandor neón intenso** (4 `drop-shadow` de 0,12/0,3/0,6/1,1 em en `.live-name::after`). Historial: nombre de color, degradados y contorno oscuro se probaron y se descartaron. El mismo CSS vale para el 3D y el respaldo de imagen (`IsoBoard`).
- **Nombre sobre el personaje, editable** (pedido del usuario): en el editor, «🧟 Fichas» → sección «Nombre sobre el personaje» (`NamesSection` en `TokensDialog.tsx`, con vista previa que usa el mismo `.live-name`): **tamaño** (50-200 %), **tipo de letra** (las de `NUMBER_FONTS`), **espaciado** (−10 a 30 centésimas de em), **opacidad de la burbuja** (0-100 %) e el neón de la flecha con **dos** ajustes (pedido del usuario: «una cosa es la fuerza y otra el alcance»): **fuerza** `glow` (0-200 %, la opacidad de la luz: de 100 a 200 % se suma una segunda capa) y **alcance** `reach` (20-300 %, el radio al que llega la luz). En CSS son `--name-glow` y `--name-reach` (`color-mix` con la opacidad, con una versión simple de respaldo para TV viejas), y «Volver a los valores de serie». Se guarda con el diseño (`BoardLayout.names: NameStyle`, `DEFAULT_NAMES`/`NAME_LIMITS`/`parseNames` en `layout.ts`, con test) y se publica con él (`layout` de `PublishedBoard`). La TV en 3D lo aplica: `liveBoard.ts` pone las variables CSS `--name-font/-spacing/-bubble/-glow` (`nameCssVars`) en el contenedor de los nombres y multiplica el tamaño por `names.size/100`. **Limitación**: el respaldo en imagen (`IsoBoard`, cuando el 3D no carga) no lee el diseño y usa los valores de serie. Un ajuste nuevo del nombre se añade en `NameStyle`, `parseNames`, `nameCssVars` y la sección.
- **Ojos con luz neón amarilla** (pedido del usuario, retratos del `TurnChip`, marcador, tarjetas y sprites de la TV): `eyeGlow` en `src/editor/characterSheet.ts` se aplica a cada dibujo de **frente** al hacer la hoja (`renderCharacterSheet`): busca los píxeles amarillo-limón de los ojos (tono 52°-64°; la ropa y el pelo amarillos son más naranjas, < 50°, y no brillan) y los suma desenfocados (3 halos) con `globalCompositeOperation: "lighter"`. La hoja de serie `public/art/zombis.webp` se volvió a hacer con `node scripts/characters/sheet.mjs <url del dev>` (`feet`/`span` no cambian). **La hoja publicada se rehace al «Publicar en la TV»**: hasta entonces la TV usa la anterior. Los zombis 3D en vivo (`LiveBoard`) llevan el suyo (ver abajo).
- **Sin gafas** (pedido del usuario): el personaje de gafas (`character-male-a`) las pierde: `yellowEyes` (`characterSheet.ts`) elimina las piezas claras (luminosidad > 0,66), pequeñas (alto ≤ 0,1), planas a la altura de los ojos (y 0,47-0,51) y delante de la cara (z 0,14-0,18) —lentes, puente y patillas— y así se ven sus ojos amarillos con neón como los de los demás. Comprobado: las otras 11 filas de la hoja no cambian. Afecta también a los zombis 3D en vivo (`loadAll` es común). Hoja de serie regenerada; la publicada se rehace al «Publicar en la TV».
- **Ojos con neón en el tablero 3D** (pedido del usuario): `LiveBoard.makeToken` (1) pone a los zombis un mapa emisivo propio (`eyeEmissiveMap` en `characterSheet.ts`: la paleta al 32 % con el cuadrito amarillo de los ojos a plena luz) y (2) cuelga un halo (`THREE.Sprite` aditivo, `glowTex`, `depthTest: false`, escala 0,14) de cada ojo en el hueso `head`. Las posiciones de los ojos las guarda `yellowEyes` en `Loaded.eyes` (espacio del modelo sin escalar; **al pasarlas al hueso hay que multiplicarlas por la escala `base` del modelo**, error que dejó el halo debajo de los ojos). El halo solo se ve cuando la cara mira hacia la cámara (`opacity` según `facing = adelante·camDir`, `camDir` sale de `tvDirection(layout.tvView)`): de espaldas no brilla a través del pelo.
- **Tamaño de la interfaz de la TV, editable** (pedido del usuario): en el panel izquierdo del editor, «🖥️ Tamaño de la interfaz en la TV»: **Tarjeta de la casilla** (abajo a la derecha) y **Cuadro del turno** (arriba a la izquierda), 50-180 % (100 % = serie). Se guarda con el diseño (`BoardLayout.ui: UiSize`, `parseUi`/`DEFAULT_UI`/`UI_SIZE_LIMITS` en `layout.ts`, con test) y la TV (`mesa/[code]/page.tsx`, `usePublishedLayout(true)`) lo aplica con `transform: scale` desde la esquina de cada uno (`scale` de `RuleCard` y `TurnChip`). Hay que «Publicar» para verlo en la TV. No afecta al celular. La clasificatoria y los títulos grandes de la TV no escalan con esto.
- **Halo de los ojos en 3D, versión suave** (el usuario lo vio «rara»: dos manchas grandes sobre la cara): el halo es más chico (`scale` 0,095 en vez de 0,14), con `depthTest: true` (ya no se ve a través de la cabeza), un poco más adelantado (+0,045), y su opacidad sube solo cuando la cara mira a la cámara (`(facing − 0,3) × 2,2`, máx. 0,7).
- Halo de los ojos en 3D, **ajuste final**: el usuario prefería el brillo grande y fuerte del primero (`scale` 0,14, opacidad `facing*1,8−0,1` máx. 0,95, +0,02 en z) y solo le molestaba que saliera de la cara; se dejó ese brillo con `depthTest: true` para que quede pegado a la cara y no se vea a través de la cabeza.
- **Fin de partida** (pedido del usuario): la partida terminada se queda tal cual (TV y celular) hasta que el celular elija. En el celular salen «VER CLASIFICATORIA», «REINICIAR (MISMOS JUGADORES)» (`POST /api/rooms/:code/reset` con `{ secret, same: true }` → `resetRoom(code, who, true)` crea otra partida con los mismos nombres, géneros y colores) y «SALIR» (reset a la pantalla de jugadores y a `/`). Nada reinicia solo la partida.
- **«+ Trago», apodos y trabalenguas** (pedido del usuario): (1) el celular tiene el botón **«+ TRAGO»** arriba (junto a «☰ MARCADOR», `addDrink` en `c/[code]/page.tsx`): abre una lista de jugadores y cada toque suma 1 vaso a ese jugador con la acción `{ type: "ADD_DRINK", id, n? }` (el motor la acepta en cualquier momento salvo con la partida terminada; no cambia turno ni fase; pasa por `drink()` igual que cualquier trago, así que respeta Poseído/Capilla y queda como «debe» en el marcador). Sirve para el apodo y para cualquier trago suelto. (2) La casilla 14 ya no es «Chorizo» sino **«Nuevo apodo»** (`nickname: true` en `board.ts`, clave de tarjeta `RETO:Nuevo apodo`; un texto propio viejo de `RETO:Chorizo` queda huérfano y se ignora): al caer saca un apodo al azar (`GameState.nickname`, hueco `{apodo}` en la tarjeta y en el texto de la decisión). (3) Las listas editables son ahora **tres** (`ContentLists` en `game/content.ts`: `categories`, `twisters` = trabalenguas de Lenguados, `nicknames`), cada una con sus de serie (`DEFAULT_*`), `get/set/parse`, y se guardan en Redis (`cards:categories|twisters|nicknames`, `src/server/lists.ts` → `loadLists`/`saveLists`; `GET /api/cards` y `PUT /api/admin/cards` las llevan en el mismo cuerpo; `setLists` las pone en el juego; el servidor las carga antes de cada `ROLL`/`DUEL_ROLL`). En el editor «📝 Tarjetas» salen como tres cuadros de texto (`LIST_BOXES` en `CardsDialog.tsx`, una por línea, con «Volver a las de serie»). Una lista nueva se añade en `content.ts`, `lists.ts` y `LIST_BOXES`.
- **Pacto de Sangre** (pedido del usuario): quien firma el pacto elige en el celular a su pactado (`SLAVE`/`CHOOSE_SLAVE`, `GameState.slave { master, slave }`). Todo lo que beba el que firmó, **por la razón que sea** (casillas, duelo, penitencia, «+ Trago»…), lo bebe también su pactado y se le **suma en su marcador** (`bloodPact` en `engine.ts`, llamado desde `drink()` con lo que de verdad bebió el que firmó, también la mitad que absorbe un Poseído; no es en cadena: lo que beba el pactado no arrastra al que firmó). **Dura una ronda**, como dice la tarjeta: `endTurn` lo quita cuando el turno vuelve a quien lo firmó (antes no terminaba nunca). El marcador enseña «🩸 → pactado» en quien firmó y «🩸 ← quien firmó» en el pactado (`PlayersList`).
- **Yo nunca** (pedido del usuario): tipo de casilla nuevo `YO_NUNCA` (`board.ts`) en las casillas **7, 29 y 37** (antes duelos; quedan **2 duelos**: 19 «hasta 2 rivales» y 47 «hasta 5»). Al caer sale una frase al azar de la lista (`GameState.nunca`, hueco `{frase}`) y se abre la decisión `SELECT_DRINKERS` de 1 vaso: en el celular se marcan los que **sí** lo hicieron (también quien cayó). Tiene su **icono propio** `hand` (mano levantada, `icons.ts`, también en `ICON_LABELS`; en el tablero 3D de serie, `scripts/board3d/scene.ts`, pinta «YO»), color azul (`TILE_STYLE`/`TILE_ACCENT`), título grande «¡YO NUNCA!» (`EVENTS`), tarjeta editable «Yo nunca» (`FIXED.YO_NUNCA` en `cards.ts`, grupo «Casillas con decisión») y la lista de **54 frases** es la **cuarta lista editable** (`nunca` en `ContentLists`/`lists.ts`: `cards:nunca`, `DEFAULT_NUNCA`, 200 letras máx.; en «📝 Tarjetas» → «🤚 Frases de “Yo nunca”»). `decisionRule` (`TvCards`) usa siempre la tarjeta para este tipo, como La Ouija. **Hay que «Publicar en la TV» para que el tablero 3D publicado enseñe el icono nuevo**; la imagen de serie (`public/art/board.webp`, respaldo sin 3D) no se regeneró y aún enseña calaveras en esas 3 casillas (se arregla con `node scripts/board3d/render.mjs`).
- **Yo nunca es individual** (corrección del usuario; las del ojito, «Juicio de los vivos», son grupales): al caer sale la frase y quien cayó responde en el celular (decisión `NUNCA`, acción `{ type: "NUNCA", did }`, botones «SÍ LO HE HECHO (BEBO 1)» / «NUNCA LO HE HECHO» en `DecisionPanel`): **solo bebe él**, y solo si dice que sí; no se marca a nadie más. La tarjeta dice «{frase} Si lo has hecho, bebes 1 vaso.» (el texto grupal anterior está en `LEGACY`).
- **Juicio de los vivos con cartas al azar** (pedido del usuario): las **9 casillas del ojito** (`RASGO`: 2, 3, 5, 11, 21, 32, 46, 51, 54) ya no son rasgos fijos (Machos, Cegatos, Pares… y sus 2 vasos): `RASGO` ahora es solo `{ n, type }` y al caer **sale una carta distinta de una lista de 55** (`GameState.juicio`, hueco `{frase}`; votaciones tipo «Votad por la persona más chistosa; esa persona bebe» y «Todos los que usen Android beben»). Es la **quinta lista editable** (`juicio` en `ContentLists`/`lists.ts`: `cards:juicio`, `DEFAULT_JUICIO`, 200 letras; en «📝 Tarjetas» → «👁️ Cartas de Juicio de los vivos»). Siempre **1 vaso**: se abre `SELECT_DRINKERS` y el celular marca quiénes beben (también sirve para votaciones: se marca al votado). Hay **una sola tarjeta** `RASGO` («Juicio de los vivos», «Se repite ×9», texto `{frase}`; las claves viejas `RASGO:<título>` quedan huérfanas y se ignoran); `decisionRule` la usa siempre. Se quitaron `Trait`/`TRAIT_LABELS` y el atajo de género (la casilla ya no se resuelve sola por hombre/mujer). **Las 2 casillas «Pa' los de atrás/alante» (`POSICION`) no cambian.**
- **Grupo «Ronda» en «📝 Tarjetas»** (pedido del usuario): las tarjetas cuyo efecto **dura toda la ronda** y no se resuelve en el mismo turno van juntas en un grupo nuevo «Ronda» (`ROUND_CARDS` en `cards.ts`, que `groupOf` consulta antes del tipo): **Nuevo apodo** (14), **Ley del Más Allá**, **Pacto de Sangre**, **Poseído** y **La Capilla**. Es solo orden del editor (cada tipo sigue en su grupo de siempre para el test de cobertura); para mover una tarjeta de/ a «Ronda», se añade o quita su clave en `ROUND_CARDS`.
