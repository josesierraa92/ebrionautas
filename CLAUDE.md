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

## Tablero 3D, animaciones y sonido

- La TV y `/jugar` usan el **tablero 3D** estilo "Monopoly online": `src/components/Board3D.tsx`
  (Three.js con React Three Fiber + Drei), cargado sin SSR por `src/components/BoardStage.tsx`, que
  además pinta encima el dado y los títulos (`src/components/Fx.tsx`).
- `src/game/ringPath.ts`: las 62 casillas en anillo (lados de 15 y 14 + 4 esquinas; la 62 es una
  esquina, justo antes de la salida). `CameraRig` encuadra el tablero según la proporción de la pantalla.
- Las texturas de las casillas se dibujan en un canvas (por ahora con emojis); el plan es sustituirlas
  por ilustraciones generadas con IA.
- `src/lib/useGameFx.ts`: a partir de los cambios de estado anima el dado (`rollSeq`), el paso a paso de
  la ficha, vuelos (Oca, agujero negro…), títulos grandes y dispara los sonidos (`src/lib/sfx.ts`, Web Audio
  sintetizado, sin archivos).
- El celular de control sigue usando el tablero 2D en espiral (`src/components/Board.tsx`, `src/game/spiral.ts`).
