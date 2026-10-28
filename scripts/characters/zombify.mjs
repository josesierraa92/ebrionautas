// Personajes del kit "Mini Characters" de Kenney (CC0, www.kenney.nl): copia los 12 personajes (6 hombres y 6
// mujeres) y su paleta a public/personajes/. La piel verde de zombi se pinta al dibujarlos (src/editor/characterSheet.ts,
// `SKIN`), porque la franja de piel de unos es el pelo o la ropa de otros. Uso:
//   node scripts/characters/zombify.mjs <carpeta "Models/GLB format" del kit>
import fs from "node:fs";
import path from "node:path";

const src = process.argv[2];
if (!src) throw new Error("Uso: node scripts/characters/zombify.mjs <carpeta GLB del kit>");
const out = path.resolve("public/personajes");
fs.mkdirSync(path.join(out, "Textures"), { recursive: true });
for (const g of ["male", "female"])
  for (const l of "abcdef") fs.copyFileSync(path.join(src, `character-${g}-${l}.glb`), path.join(out, `character-${g}-${l}.glb`));
fs.copyFileSync(path.join(src, "Textures/colormap.png"), path.join(out, "Textures/colormap.png"));
fs.copyFileSync(path.join(src, "../../License.txt"), path.join(out, "License.txt"));
console.log("Personajes copiados a", out);
