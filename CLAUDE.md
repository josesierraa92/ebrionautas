# CLAUDE.md

**Muertos de Sed** (antes "Ebrionautas"): juego de mesa virtual para beber (tablero tipo Oca) con tema de
Día de Muertos: los muertos tienen una sola noche al año para salir de fiesta y deben volver a su tumba antes
de que salga el sol. Lema: "Una noche para beber. Toda la eternidad para dormirla." Plan original en
`docs/plan-ebrionautas.md` (escrito con el tema anterior de extraterrestres; las mecánicas siguen valiendo).

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
- `/jugar`: sin TV, todo en una misma pantalla (partida guardada en localStorage).
- El género resuelve solas las casillas Machos (2) y Hembras (11); el resto de casillas de
  "quién bebe" las marca el control.
- Las fichas son 8 zombis fijos (uno por color de jugador) con la misma silueta: el zombi del kit de Kenney
  con la camisa del color del jugador, brazos hacia delante, botella en la mano y un accesorio en la cabeza
  (`alien()`/`headgear()`/`LOOKS` en `scripts/board3d/scene.ts`; en el código el componente sigue llamándose
  `Marciano` y las imágenes `public/art/alien/`). No hay pantalla para personalizarlos: perfiles,
  accesorios a elegir y votación por celular se quitaron a propósito; no reintroducirlos sin que lo pida.
- El servidor es la autoridad: `src/server/rooms.ts` guarda la mesa, ejecuta el motor
  (dados incluidos) y solo acepta jugadas con la clave del control. API en `src/app/api/rooms/`.
  Los clientes consultan la mesa cada 1 s (`src/lib/room-client.ts`) y solo aceptan versiones nuevas.
- Almacén: Upstash Redis por REST (`src/server/store.ts`), con las variables
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` o `KV_REST_API_URL`/`KV_REST_API_TOKEN`.
  Sin ellas, en desarrollo usa memoria (las mesas se pierden al reiniciar).

## Tablero isométrico, animaciones y sonido

- La TV y `/jugar` usan el **tablero isométrico** (`src/components/IsoBoard.tsx`): una imagen 3D pre-renderizada
  (ver abajo) con las fichas en SVG encima. Nada de WebGL en el navegador: el 3D en vivo rompía en la TV del usuario.
- Cámara: el tablero está siempre con zoom (`ZOOM` en `IsoBoard`) y sigue a la última ficha que tiró (`focus` de
  `useGameFx`; antes de la primera tirada, al jugador de turno). El usuario no quiere que se aleje. Animaciones rápidas. Cada losa lleva su número de pie en el borde delantero.
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
- Purgatorio (cárcel; regla del usuario): en su turno el preso tira; con 1-3 bebe 2, con 4-6 bebe 4 (`jailBail`), sale
  y vuelve a tirar para avanzar. No hay opción de esperar. La TV muestra la tarjeta "¡Sale del Purgatorio!" (`jailOutcome`).
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
  siguen siendo el zombi de serie. La petición de publicar lleva todo junto: el tablero se limita a ~3,3 MB.
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
