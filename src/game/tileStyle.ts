import type { Tile } from "./board";

// Aspecto de cada tipo de casilla: paleta de Día de Muertos (morado, naranja cempasúchil, rosa mexicano).
// bg: degradado de arriba (claro) a abajo (oscuro); dark: texto blanco encima.
export const TILE_STYLE: Record<Tile["type"], { icon: string; bg: [string, string]; dark: boolean; label: string }> = {
  SALIDA: { icon: "🕛", bg: ["#9b5de5", "#5a2a9e"], dark: true, label: "Medianoche" },
  META: { icon: "🪦", bg: ["#ffb627", "#ff7a00"], dark: false, label: "Tu Tumba" },
  POSADA: { icon: "⛪", bg: ["#ffd166", "#d99a1e"], dark: true, label: "Capilla" },
  A_BEBER: { icon: "🥃", bg: ["#ffd23f", "#f5a300"], dark: false, label: "¡Regalo!" },
  DUELO: { icon: "💀", bg: ["#fff4e6", "#d9c8b4"], dark: false, label: "Duelo" },
  OCA: { icon: "🦇", bg: ["#ff8c42", "#d9480f"], dark: false, label: "Murciélago" },
  LABERINTO: { icon: "🌫️", bg: ["#b8b2d8", "#7d74b0"], dark: true, label: "Niebla" },
  REGLA: { icon: "⚖️", bg: ["#b98bf0", "#7a3fd0"], dark: true, label: "Ley" },
  CULTURAL: { icon: "🔮", bg: ["#ff5d8f", "#c2185b"], dark: true, label: "Ouija" },
  RONDA: { icon: "⏳", bg: ["#c6f26a", "#5fb21f"], dark: false, label: "Ronda" },
  YO_NUNCA: { icon: "🤚", bg: ["#8fb0ff", "#3b5bdb"], dark: true, label: "Yo nunca" },
  HIPNOSIS: { icon: "👻", bg: ["#7ff0e0", "#20b2a0"], dark: true, label: "Poseído" },
  CARCEL: { icon: "🔥", bg: ["#ff6b3d", "#c43a10"], dark: true, label: "Purgatorio" },
  MUERTE: { icon: "⚰️", bg: ["#3a2a5a", "#05030f"], dark: true, label: "La Fosa" },
  PATINAZO: { icon: "🪦", bg: ["#a8a4b8", "#6e6a82"], dark: false, label: "Tropiezo" },
  POSICION: { icon: "👀", bg: ["#ff9fd0", "#e05aa0"], dark: false, label: "" },
  RASGO: { icon: "🔬", bg: ["#ff9fd0", "#e05aa0"], dark: false, label: "" },
  ESCLAVO: { icon: "🩸", bg: ["#ff4f6b", "#b0102c"], dark: false, label: "Pacto" },
  RETO: { icon: "🎤", bg: ["#6fdcff", "#0094d4"], dark: false, label: "" },
};

/** Color de acento de cada tipo de casilla en las tarjetas y títulos (vivo, para leerse sobre fondo oscuro). */
export const TILE_ACCENT: Record<Tile["type"], string> = {
  SALIDA: "#b98bf0",
  META: "#ffb627",
  POSADA: "#ffd166",
  A_BEBER: "#ffc61a",
  DUELO: "#f3e9ff",
  OCA: "#ff9f1c",
  LABERINTO: "#c9b8ff",
  REGLA: "#b98bf0",
  CULTURAL: "#ff6b7d",
  YO_NUNCA: "#7aa2ff",
  RONDA: "#b6e55a",
  HIPNOSIS: "#5be8d4",
  CARCEL: "#ff6b3d",
  MUERTE: "#b07cff",
  PATINAZO: "#ff8a1f",
  POSICION: "#ff9fd0",
  RASGO: "#ff9fd0",
  ESCLAVO: "#ff4f6b",
  RETO: "#6fdcff",
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
  // 9-16: más jugadores (cada color lleva su propio accesorio, ver LOOKS en scripts/board3d/scene.ts)
  "#ff7eb6",
  "#8fdcff",
  "#b8f35a",
  "#c9cdd6",
  "#8c5a2a",
  "#243b9e",
  "#f4efe0",
  "#3b3b48",
];

/** Marciano 3D (generado con IA) del color de un jugador, o null si el color no es de la lista. */
export function alienArt(skin: string): string | null {
  const i = PLAYER_COLORS.indexOf(skin.toLowerCase());
  return i < 0 ? null : `/art/alien/${i}.webp`;
}
