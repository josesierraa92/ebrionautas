import type { Tile } from "./board";

// Icono y color de cada tipo de casilla (colores de la leyenda del tablero).
export const TILE_STYLE: Record<Tile["type"], { icon: string; bg: string }> = {
  SALIDA: { icon: "🚀", bg: "#2f7bf5" },
  META: { icon: "🌍", bg: "#ffc61a" },
  POSADA: { icon: "⛽", bg: "#8a5a2b" },
  A_BEBER: { icon: "🍷", bg: "#ffc61a" },
  DUELO: { icon: "🎲", bg: "#ffffff" },
  OCA: { icon: "🦆", bg: "#7fd3ff" },
  LABERINTO: { icon: "☄️", bg: "#3fae5a" },
  REGLA: { icon: "⚖️", bg: "#9b5de5" },
  CULTURAL: { icon: "❓", bg: "#e8344a" },
  HIPNOSIS: { icon: "🌀", bg: "#f15bb5" },
  CARCEL: { icon: "🚔", bg: "#5c6b80" },
  MUERTE: { icon: "🕳️", bg: "#111111" },
  PATINAZO: { icon: "🪐", bg: "#ff8a1f" },
  POSICION: { icon: "👀", bg: "#5cd23c" },
  RASGO: { icon: "🔬", bg: "#5cd23c" },
  ESCLAVO: { icon: "⛓️", bg: "#a0a0a0" },
  RETO: { icon: "🎤", bg: "#00bbf9" },
};

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
