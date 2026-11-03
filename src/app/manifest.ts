import type { MetadataRoute } from "next";

// Al «añadir a pantalla de inicio» el juego se abre sin las barras del navegador (pantalla completa).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Muertos de Sed",
    short_name: "Muertos de Sed",
    description: "El juego de mesa para beber del Día de Muertos.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0620",
    theme_color: "#1b1f4b",
  };
}
