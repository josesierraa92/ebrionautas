// Renderiza el tablero 3D, los marcianos y las ilustraciones de casilla a imágenes
// (public/art/board.webp, public/art/alien/<i>.webp y public/art/<tipo>.webp).
// Uso: node scripts/board3d/render.mjs
// Empaqueta scene.ts con esbuild, lo abre en Chromium sin pantalla (WebGL por software) y guarda el resultado.

import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import sharp from "sharp";

// Playwright viene instalado en el sistema (no en el proyecto): se carga con require.
const { chromium } = createRequire(import.meta.url)("playwright");

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = join(root, "public", "art");

const bundle = await build({
  entryPoints: [join(root, "scripts", "board3d", "scene.ts")],
  bundle: true,
  format: "esm",
  write: false,
  tsconfig: join(root, "tsconfig.json"),
  logLevel: "warning",
});
const js = bundle.outputFiles[0].text;
const html = `<!doctype html><html><body style="margin:0;background:#000"><script type="module">${js.replace(/<\/script>/g, "<\\/script>")}</script></body></html>`;

// Sirve la página y los modelos 3D (scripts/board3d/models, p. ej. el Graveyard Kit de Kenney, CC0).
const models = join(root, "scripts", "board3d", "models");
const TYPES = { ".glb": "model/gltf-binary", ".png": "image/png" };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (url.startsWith("/models/") && !url.includes("..")) {
    try {
      const file = join(models, url.slice("/models/".length));
      res.writeHead(200, { "content-type": TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
    return;
  }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(html);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("error en la página:", e.message));
page.on("console", (m) => m.type() === "error" && console.error(m.text()));
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => typeof window.__render === "function", null, { timeout: 60000 });
console.log("renderizando…");
// __render es asíncrono: primero carga los modelos 3D y luego renderiza
const result = await page.evaluate(() => window.__render());
await browser.close();
server.close();

const png = (dataUrl) => Buffer.from(dataUrl.split(",")[1], "base64");
await mkdir(join(out, "alien"), { recursive: true });
await sharp(png(result.board)).webp({ quality: 86 }).toFile(join(out, "board.webp"));
console.log("ok board.webp");
// Todos los marcianos se recortan con el mismo marco (la unión de sus bordes), para que el cuerpo
// salga del mismo tamaño aunque unos lleven sombrero alto.
const boxes = await Promise.all(
  result.aliens.map(async (a) => {
    const { info } = await sharp(png(a)).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });
    return { left: -info.trimOffsetLeft, top: -info.trimOffsetTop, right: -info.trimOffsetLeft + info.width, bottom: -info.trimOffsetTop + info.height };
  }),
);
const frame = {
  left: Math.min(...boxes.map((b) => b.left)),
  top: Math.min(...boxes.map((b) => b.top)),
  width: Math.max(...boxes.map((b) => b.right)) - Math.min(...boxes.map((b) => b.left)),
  height: Math.max(...boxes.map((b) => b.bottom)) - Math.min(...boxes.map((b) => b.top)),
};
for (const [i, a] of result.aliens.entries()) {
  await sharp(png(a)).extract(frame).webp({ quality: 90 }).toFile(join(out, "alien", `${i}.webp`));
}
console.log("ok", result.aliens.length, "calaveritas");
for (const [name, icon] of Object.entries(result.icons)) {
  await sharp(png(icon)).trim({ threshold: 0 }).webp({ quality: 90 }).toFile(join(out, `${name}.webp`));
}
console.log("ok", Object.keys(result.icons).length, "ilustraciones de casilla");
