# CLAUDE.md

Ebrionautas: juego de mesa virtual (tablero tipo Oca para beber, tema
extraterrestres borrachos). Plan completo en `docs/plan-ebrionautas.md`:
léelo antes de implementar algo nuevo.

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
  liberarlo con "cambiar de celular"). Agrega la tripulación (nombre + hombre/mujer), tira y decide.
  En partida solo enseña un dado gigante (`src/components/DiceController.tsx`) que se tira tocándolo o
  agitando el celular (`src/lib/useShake.ts`; en iPhone pide permiso de movimiento), de quién es el turno
  y "Siguiente: nombre" para saber a quién pasarle el celular. Marcador, historial y tablero van en "☰ MARCADOR".
- `/jugar`: sin TV, todo en una misma pantalla (partida guardada en localStorage).
- El género resuelve solas las casillas Machos (2) y Hembras (11); el resto de casillas de
  "quién bebe" las marca el control.
- Las fichas son marcianos de colores (`src/components/Marciano.tsx`, `defaultAvatar`).
  Perfiles, disfraces, accesorios y votación por celular se quitaron a propósito
  (decisión del usuario); no reintroducirlos sin que lo pida.
- El servidor es la autoridad: `src/server/rooms.ts` guarda la mesa, ejecuta el motor
  (dados incluidos) y solo acepta jugadas con la clave del control. API en `src/app/api/rooms/`.
  Los clientes consultan la mesa cada 1 s (`src/lib/room-client.ts`) y solo aceptan versiones nuevas.
- Almacén: Upstash Redis por REST (`src/server/store.ts`), con las variables
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` o `KV_REST_API_URL`/`KV_REST_API_TOKEN`.
  Sin ellas, en desarrollo usa memoria (las mesas se pierden al reiniciar).

## Tablero isométrico, animaciones y sonido

- La TV y `/jugar` usan el **tablero isométrico 2.5D** (`src/components/IsoBoard.tsx`): SVG con aspecto 3D
  (losas con canto, sombras, árboles, lago, OVNI) sobre una isla flotando en el espacio. Sin WebGL a propósito:
  el 3D con Three.js rompía en TV sin WebGL y el usuario prefirió "2D tipo 3D".
- Cámara: mientras una ficha avanza, `IsoBoard` hace zoom sobre ella (`focus` de `useGameFx`) y luego vuelve a
  enseñar todo el tablero. Cada losa lleva su número de pie en el borde delantero.
- `src/game/isoPath.ts`: recorrido de las 62 casillas (4 tramos de 14 + conectores de 2). `src/components/BoardStage.tsx`
  pinta encima el dado y los títulos (`src/components/Fx.tsx`).
- Los íconos de las casillas son emojis por ahora; el plan es sustituirlos por ilustraciones generadas con IA
  (Cloudflare Workers AI, variables `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN`).
- `src/lib/useGameFx.ts`: a partir de los cambios de estado anima el dado (`rollSeq`), el paso a paso de
  la ficha, vuelos (Oca, agujero negro…), títulos grandes y dispara los sonidos (`src/lib/sfx.ts`, Web Audio
  sintetizado, sin archivos).
- TV: con "SOLO TABLERO" el marcador se oculta y el tablero ocupa toda la pantalla (se recuerda en esa TV);
  hay botón de pantalla completa. En una esquina, `TurnChip` muestra el turno y quién sacó cuánto en el dado.
- Cada casilla donde cae alguien saca una tarjeta pequeña en la esquina inferior derecha (`RuleCard` en
  `src/components/TvCards.tsx`; lo principal es que se vea el tablero). El celular enseña la misma tarjeta arriba del
  dado (`PhoneRuleCard`, contenido compartido en `cardContent`). Con
  su regla explicada (`src/game/rules.ts`). Se queda hasta la siguiente tirada (para que dé tiempo a leerla);
  si hay que decidir, además dice qué marcar en el celular. Al tirar perdido en los asteroides sale el resultado
  (`mazeOutcome`: con 5 o 6 "¡Se salvó!", si no "¡Sigue perdido!" y bebe).
- Calabozo (regla del usuario): en su turno el preso tira; con 1-3 bebe 2, con 4-6 bebe 4 (`jailBail`), sale
  y vuelve a tirar para avanzar. No hay opción de esperar. La TV muestra la tarjeta "¡Fianza pagada!" (`jailOutcome`).
- Toda casilla que diga "tira el dado" debe enseñar después una tarjeta con lo que pasó (TV y celular):
  asteroides (`mazeOutcome`), calabozo (`jailOutcome`) y duelo (`lastDuel` en el estado + `duelOutcome`).
- Lore: la tripulación se estrelló tras la fiesta y hay que llevarla (borracha) a la **Nave Nodriza** (casilla 62).
  Las "Ocas" son OVNIs teletransportadores 🛸. Nada de patos ni de "la Tierra" como meta.
- El menú del celular usa el tablero 2D en espiral (`src/components/Board.tsx`, `src/game/spiral.ts`).
