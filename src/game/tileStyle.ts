import type { Tile } from "./board";

// Aspecto de cada tipo de casilla (colores de la leyenda del tablero original).
// bg: degradado de arriba (claro) a abajo (oscuro); dark: texto blanco encima.
export const TILE_STYLE: Record<Tile["type"], { icon: string; bg: [string, string]; dark: boolean; label: string }> = {
  SALIDA: { icon: "🚀", bg: ["#5aa0ff", "#1f5fd6"], dark: true, label: "Despegue" },
  META: { icon: "🛸", bg: ["#ffe066", "#ff9f1c"], dark: false, label: "Nave Nodriza" },
  POSADA: { icon: "⛽", bg: ["#c08a52", "#7a4b22"], dark: true, label: "Gasolinera" },
  A_BEBER: { icon: "🍷", bg: ["#ffe066", "#f5b400"], dark: false, label: "¡A beber!" },
  DUELO: { icon: "🎲", bg: ["#ffffff", "#d8deea"], dark: false, label: "Duelo" },
  OCA: { icon: "🛸", bg: ["#bfeaff", "#5cc4f5"], dark: false, label: "OVNI" },
  LABERINTO: { icon: "☄️", bg: ["#5fd07a", "#2a8a46"], dark: true, label: "Asteroides" },
  REGLA: { icon: "⚖️", bg: ["#b98bf0", "#7a3fd0"], dark: true, label: "Ley" },
  CULTURAL: { icon: "❓", bg: ["#ff6b7d", "#c81e3a"], dark: true, label: "Examen" },
  HIPNOSIS: { icon: "🌀", bg: ["#ff8fcf", "#d63c9a"], dark: true, label: "Abducción" },
  CARCEL: { icon: "🚔", bg: ["#8a99b0", "#465468"], dark: true, label: "Calabozo" },
  MUERTE: { icon: "🕳️", bg: ["#3a2a5a", "#05030f"], dark: true, label: "Agujero negro" },
  PATINAZO: { icon: "🪐", bg: ["#ffb35c", "#e86a00"], dark: false, label: "Resbalón" },
  POSICION: { icon: "👀", bg: ["#8fe36b", "#3fae2a"], dark: false, label: "" },
  RASGO: { icon: "🔬", bg: ["#8fe36b", "#3fae2a"], dark: false, label: "" },
  ESCLAVO: { icon: "⛓️", bg: ["#d0d0d8", "#8a8a96"], dark: false, label: "Esclavos" },
  RETO: { icon: "🎤", bg: ["#6fdcff", "#0094d4"], dark: false, label: "" },
};

/** Ilustración de cada tipo de casilla (generada con IA: `scripts/gen-art.py`, en `public/art/`). */
export function tileArt(type: Tile["type"]): string {
  return `/art/${type.toLowerCase()}.webp`;
}

/** Nombre corto para mostrar en la casilla. */
export function tileLabel(tile: Tile): string {
  return "title" in tile ? tile.title : TILE_STYLE[tile.type].label;
}

export const PLAYER_COLORS = [
  "#5cd23c",
  "#2f7bf5",
  "#e53fd6",
  "#ffc61a",
  "#e8344a",
  "#00d1c1",
  "#ff8a1f",
  "#9b5de5",
];

/** Marciano 3D (generado con IA) del color de un jugador, o null si el color no es de la lista. */
export function alienArt(skin: string): string | null {
  const i = PLAYER_COLORS.indexOf(skin.toLowerCase());
  return i < 0 ? null : `/art/alien/${i}.webp`;
}
