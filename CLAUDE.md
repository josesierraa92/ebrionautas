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

## Multijugador (Fase 2)

- `/mesa/[code]`: pantalla grande (TV) con QR y tablero. `/j/[code]`: celular de
  cada jugador. `/jugar`: modo local en un solo dispositivo.
- El servidor es la autoridad: `src/server/rooms.ts` guarda la sala, ejecuta el
  motor (dados incluidos) y valida que actúe quien tiene el turno. API en
  `src/app/api/rooms/`. Los clientes consultan la sala cada 1 s (`src/lib/room-client.ts`).
- Almacén: Upstash Redis por REST (`src/server/store.ts`), con las variables
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` o `KV_REST_API_URL`/`KV_REST_API_TOKEN`.
  Sin ellas, en desarrollo usa memoria (las salas se pierden al reiniciar).
- Identidad sin login: al unirse, el celular recibe un `secret` que guarda en
  localStorage; nunca se envía en la vista pública de la sala.
