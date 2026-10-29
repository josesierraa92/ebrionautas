// Genera la botella low poly del juego (estilo voxel: vidrio verde, tapa marrón, etiqueta clara alargada con una X negra, como el icono de beber):
// public/models/juego/botella.glb. Todo es geometría con colores planos (sin texturas), unas pocas decenas de cajas.
// Uso: node scripts/editor/botella.mjs   (después, node scripts/editor/catalog.mjs para que salga en el catálogo del editor)
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// GLTFExporter usa FileReader para el binario: en Node se simula con Blob.arrayBuffer()
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((r) => {
      this.result = r;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((r) => {
      this.result = `data:${blob.type};base64,${Buffer.from(r).toString("base64")}`;
      this.onloadend?.();
    });
  }
};

const flat = (hex, extra = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0, flatShading: true, ...extra });
const GLASS = flat("#2f9a3c", { roughness: 0.3 });
const CAP = flat("#8a4a1e");
const LABEL = flat("#b9f063", { side: THREE.DoubleSide });
const INK = flat("#14260a");

// Estilo voxel: todo son cajas sobre una cuadrícula de 0,05 (como los personajes y el escenario del juego)
const U = 0.05;
const root = new THREE.Group();
root.name = "botella";
const box = (name, w, h, d, x, y, z, mat) => {
  // medidas en voxeles; (x, z) = centro, y = base
  const m = new THREE.Mesh(new THREE.BoxGeometry(w * U, h * U, d * U), mat);
  m.name = name;
  m.position.set(x * U, (y + h / 2) * U, z * U);
  root.add(m);
};
const HILITE = flat("#52c95f", { roughness: 0.3 });

// botella de cerveza (como el dibujo del usuario): cuerpo recto de 10×16, hombros suaves en escalón, cuello largo y delgado de 4×11,
// un collarín y una tapa pequeña arriba (32 voxeles de alto)
box("cuerpo", 10, 16, 10, 0, 0, 0, GLASS);
box("hombro1", 8, 1, 8, 0, 16, 0, GLASS);
box("hombro2", 6, 1, 6, 0, 17, 0, GLASS);
box("cuello", 4, 11, 4, 0, 18, 0, GLASS);
box("collarin", 6, 1, 6, 0, 29, 0, GLASS);
box("tapa", 4, 2, 4, 0, 30, 0, CAP);
// reflejo del vidrio: una columna más clara en la esquina delantera izquierda
box("brillo", 1, 13, 1, -4, 2, 5.02, HILITE);

// etiqueta: rectángulo alto (7×11) que cubre casi todo el frente del cuerpo, con una X de 5×5 «píxeles» negros
const FRONT = 5;
box("etiqueta", 7, 11, 1, 0, 4, FRONT + 0.5, LABEL);
for (let k = 0; k < 5; k++)
  for (const col of k === 2 ? [k] : [k, 4 - k])
    box(`x${k}${col}`, 1, 1, 0.5, col - 2, 7 + k, FRONT + 1.25, INK);

const scene = new THREE.Scene();
scene.add(root);
const glb = await new Promise((ok, fail) => new GLTFExporter().parse(scene, ok, fail, { binary: true }));

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "models", "juego");
await mkdir(out, { recursive: true });
await writeFile(join(out, "botella.glb"), Buffer.from(glb));
let tris = 0;
root.traverse((o) => {
  if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
});
console.log("ok: public/models/juego/botella.glb,", tris, "triángulos");
