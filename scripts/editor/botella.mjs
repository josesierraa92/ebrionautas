// Genera la botella low poly del juego (vidrio verde, tapa marrón, etiqueta clara con una X negra, como el icono de beber):
// public/models/juego/botella.glb. Todo es geometría con colores planos (sin texturas), a ~210 triángulos.
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

const SIDES = 8; // pocos lados: se nota que es low poly
const root = new THREE.Group();
root.name = "botella";

// cuerpo: perfil (radio, altura) girado alrededor del eje vertical
const profile = [
  // botella de cerveza: delgada y alta, con hombros suaves y cuello largo
  [0, 0],
  [0.17, 0],
  [0.2, 0.05],
  [0.2, 0.74],
  [0.17, 0.9],
  [0.105, 1.12],
  [0.078, 1.26],
  [0.078, 1.5],
  [0.095, 1.52],
  [0.095, 1.6],
  [0, 1.6],
].map(([r, y]) => new THREE.Vector2(r, y));
const body = new THREE.Mesh(new THREE.LatheGeometry(profile, SIDES), GLASS);
body.name = "vidrio";
root.add(body);

// tapa
const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.1, SIDES), CAP);
cap.name = "tapa";
cap.position.y = 1.63;
root.add(cap);

// etiqueta: un rectángulo alargado (más alto que ancho) que rodea un cuarto del cuerpo, mirando al frente (+z)
const arc = (Math.PI * 100) / 180;
const label = new THREE.Mesh(new THREE.CylinderGeometry(0.207, 0.207, 0.52, 4, 1, true, -arc / 2, arc), LABEL);
label.name = "etiqueta";
label.position.y = 0.43;
root.add(label);

// la X de la etiqueta: dos barras cruzadas
for (const [i, rot] of [Math.PI / 4, -Math.PI / 4].entries()) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.04, 0.012), INK);
  bar.name = `x${i + 1}`;
  bar.position.set(0, 0.43, 0.212);
  bar.rotation.z = rot;
  root.add(bar);
}

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
