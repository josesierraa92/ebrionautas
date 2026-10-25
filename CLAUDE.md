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
