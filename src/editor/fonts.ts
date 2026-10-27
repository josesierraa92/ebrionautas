// Tipos de letra extra para los números de las casillas (Lilita One y Fredoka ya los carga el layout de la app).
// Cada `variable` define una variable CSS en el contenedor del editor; la escena la lee para dibujar con esa fuente.
// next/font pide valores escritos tal cual (no admite objetos con `...`).
import { Bangers, Black_Ops_One, Creepster, Press_Start_2P } from "next/font/google";

const bangers = Bangers({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-bangers" });
const creepster = Creepster({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-creepster" });
const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-pixel" });
const blackops = Black_Ops_One({ weight: "400", subsets: ["latin"], preload: false, variable: "--font-blackops" });

export const EDITOR_FONT_CLASSES = [bangers, creepster, pixel, blackops].map((f) => f.variable).join(" ");
