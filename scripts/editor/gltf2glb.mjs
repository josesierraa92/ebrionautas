// Convierte modelos .gltf (con su .bin y su textura aparte) en .glb de un solo archivo, que es lo que lee el editor.
// Uso: node scripts/editor/gltf2glb.mjs <carpeta con los .gltf> <carpeta de salida>
// Después: node scripts/editor/catalog.mjs para regenerar el catálogo y las miniaturas.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error("Uso: node scripts/editor/gltf2glb.mjs <carpeta con los .gltf> <carpeta de salida>");
  process.exit(1);
}
const pad = (n) => (4 - (n % 4)) % 4;

await mkdir(out, { recursive: true });
let count = 0;
for (const file of (await readdir(src)).filter((f) => f.endsWith(".gltf"))) {
  const json = JSON.parse(await readFile(join(src, file), "utf8"));
  const chunks = [];
  let length = 0;
  const add = (buf) => {
    const offset = length;
    chunks.push(buf, Buffer.alloc(pad(buf.length)));
    length += buf.length + pad(buf.length);
    return { offset, size: buf.length };
  };
  // las vistas del .bin original conservan su posición: el .bin va primero y las imágenes se agregan detrás
  if (json.buffers?.length !== 1) throw new Error(`${file}: se esperaba un solo .bin`);
  add(await readFile(join(src, json.buffers[0].uri)));
  json.bufferViews ??= [];
  for (const img of json.images ?? []) {
    const { offset, size } = add(await readFile(join(src, img.uri)));
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: size });
    img.bufferView = json.bufferViews.length - 1;
    delete img.uri;
  }
  json.buffers = [{ byteLength: length }];

  const bin = Buffer.concat(chunks);
  let js = Buffer.from(JSON.stringify(json));
  js = Buffer.concat([js, Buffer.alloc(pad(js.length), 0x20)]);
  const head = Buffer.alloc(12);
  head.write("glTF", 0, "ascii");
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const chunkHead = (len, type) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(len, 0);
    b.write(type, 4, "ascii");
    return b;
  };
  await writeFile(join(out, basename(file, ".gltf") + ".glb"), Buffer.concat([head, chunkHead(js.length, "JSON"), js, chunkHead(bin.length, "BIN\0"), bin]));
  count++;
}
console.log("ok", count, "modelos convertidos en", out);
