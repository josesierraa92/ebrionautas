// Genera el catálogo de modelos del editor del tablero: public/models/catalog.json y una miniatura por modelo
// (public/models/<kit>/thumbs/<modelo>.webp).
// Uso: node scripts/editor/catalog.mjs
// Para añadir modelos: copiar los .glb (y su carpeta Textures si la usan) a public/models/<kit>/ y volver a ejecutarlo.

import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import sharp from "sharp";

// Playwright viene instalado en el sistema (no en el proyecto): se carga con require.
const { chromium } = createRequire(import.meta.url)("playwright");

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const models = join(root, "public", "models");

/** Nombre visible de cada kit (carpeta de public/models) y el tamaño con el que entra al tablero: cada kit
 * viene a una escala distinta; con esto un árbol mide ~2,5 casillas y una lápida ~0,5, como pide la skill. */
const KITS = {
  cementerio: { label: "Cementerio", scale: 2 },
  naturaleza: { label: "Naturaleza", scale: 2 },
  supervivencia: { label: "Supervivencia", scale: 2 },
  ciudad: { label: "Ciudad", scale: 3 },
  halloween: { label: "Halloween", scale: 0.5 }, // KayKit Halloween Bits: vienen ~4 veces más grandes
};

const kits = (await readdir(models, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
const items = [];
for (const kit of kits)
  for (const f of (await readdir(join(models, kit))).filter((f) => f.endsWith(".glb")).sort())
    items.push({ kit, name: f.slice(0, -4), file: `/models/${kit}/${f}` });

const bundle = await build({
  entryPoints: [join(root, "scripts", "editor", "thumbs.ts")],
  bundle: true,
  format: "esm",
  write: false,
  logLevel: "warning",
});
const html = `<!doctype html><html><body style="margin:0"><script type="module">${bundle.outputFiles[0].text.replace(/<\/script>/g, "<\\/script>")}</script></body></html>`;

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

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("error en la página:", e.message));
page.on("console", (m) => m.type() === "error" && console.error(m.text()));
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => typeof window.__thumbs === "function");

const catalog = [];
const BATCH = 40;
for (let i = 0; i < items.length; i += BATCH) {
  const batch = items.slice(i, i + BATCH);
  const shots = await page.evaluate((files) => window.__thumbs(files), batch.map((b) => b.file));
  for (const it of batch) {
    const shot = shots[it.file];
    if (!shot) continue;
    await mkdir(join(models, it.kit, "thumbs"), { recursive: true });
    await sharp(Buffer.from(shot.split(",")[1], "base64"))
      .resize(128, 128)
      .webp({ quality: 82 })
      .toFile(join(models, it.kit, "thumbs", `${it.name}.webp`));
    catalog.push({ id: `${it.kit}/${it.name}`, kit: it.kit, name: it.name, file: it.file, thumb: `/models/${it.kit}/thumbs/${it.name}.webp` });
  }
  console.log(`${Math.min(i + BATCH, items.length)}/${items.length}`);
}
await browser.close();
server.close();

const kitList = kits.map((id) => ({ id, label: KITS[id]?.label ?? id, scale: KITS[id]?.scale ?? 1 }));
await writeFile(join(models, "catalog.json"), JSON.stringify({ kits: kitList, models: catalog }));
console.log("ok", catalog.length, "modelos en public/models/catalog.json");
