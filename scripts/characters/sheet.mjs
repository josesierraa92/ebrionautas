// Dibuja la hoja de personajes zombi de serie (public/art/zombis.webp) con la cámara isométrica del tablero de serie
// (45°, 30° de altura), usando el mismo código que el editor al publicar (src/editor/characterSheet.ts).
// Necesita el servidor de desarrollo en marcha (npm run dev) y Playwright:
//   node scripts/characters/sheet.mjs [http://localhost:3000]
// Luego copia `feet` y `span` que imprime a STOCK_SHEET en src/game/characters.ts.
import fs from "node:fs";
import { createRequire } from "node:module";

// Playwright no es dependencia del proyecto: se usa el instalado globalmente (NODE_PATH=$(npm root -g))
const { chromium } = createRequire(import.meta.url)("playwright");

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
await page.goto(base + "/admin/editor");
await page.waitForFunction(() => window.__renderCharacterSheet, null, { timeout: 180000 });
const r = await page.evaluate(async () => {
  const { canvas, feet, span } = await window.__renderCharacterSheet({ az: 45, el: 30, tiles: 9 }, 384, 576); // doble resolución: nítidos en pantallas con escala
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/webp", 0.9));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { b64: btoa(bin), feet, span, w: canvas.width, h: canvas.height };
});
fs.writeFileSync("public/art/zombis.webp", Buffer.from(r.b64, "base64"));
console.log(JSON.stringify({ feet: r.feet, span: r.span, w: r.w, h: r.h }));
await browser.close();
