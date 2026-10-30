// Tipos de acción que el servidor acepta del celular. Es un Record exhaustivo: si se añade una acción nueva al motor (`Action` en
// `game/engine.ts`) y se olvida aquí, TypeScript falla al compilar (antes «NUNCA» y «ADD_DRINK» se rechazaban con «Acción desconocida»).
import type { Action } from "@/game/engine";

const ALL: Record<Action["type"], true> = {
  ROLL: true,
  NEXT_TURN: true,
  DISTRIBUTE: true,
  DUEL: true,
  DUEL_ROLL: true,
  PATINAZO: true,
  OCA: true,
  NUNCA: true,
  SET_RULE: true,
  SELECT_DRINKERS: true,
  CHOOSE_SLAVE: true,
  JAIL_PAY: true,
  RANKING: true,
  DRANK: true,
  ADD_DRINK: true,
  PENALTY: true,
};

export const ACTION_TYPES: ReadonlySet<string> = new Set(Object.keys(ALL));
