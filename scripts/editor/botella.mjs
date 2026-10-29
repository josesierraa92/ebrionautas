// Genera la botella low poly del juego (vidrio verde, tapa marrón, etiqueta clara alargada con una X negra, como el icono de beber):
// public/models/juego/botella.glb. Todo es geometría con colores planos (sin texturas), unos 300 triángulos.
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

const flat = (hex, extra = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0, ...extra });
const GLASS = flat("#2f9a3c", { roughness: 0.3 });
const CAP = flat("#8a4a1e");
const LABEL = flat("#b9f063", { side: THREE.DoubleSide });
const INK = flat("#14260a");

// Botella de cerveza redonda con las proporciones del dibujo del usuario: cuerpo ancho y recto (la mitad de la altura), hombros cortos,
// cuello largo y delgado, collarín y una tapa pequeña; etiqueta alta (más alta que ancha) que cubre casi todo el frente.
const SIDES = 16; // lados del giro: lo bastante redondo sin pasar de unos cientos de triángulos
const root = new THREE.Group();
root.name = "botella";

// cuerpo: perfil (radio, altura) girado alrededor del eje vertical
const profile = [
  [0, 0],
  [0.2, 0],
  [0.25, 0.04],
  [0.25, 0.84],
  [0.235, 0.9],
  [0.19, 0.95],
  [0.115, 0.99],
  [0.085, 1.04],
  [0.085, 1.45],
  [0.105, 1.465],
  [0.105, 1.5],
  [0.085, 1.5],
  [0, 1.5],
].map(([r, y]) => new THREE.Vector2(r, y));
const body = new THREE.Mesh(new THREE.LatheGeometry(profile, SIDES), GLASS);
body.name = "vidrio";
root.add(body);

// tapa pequeña arriba
const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.092, 0.11, SIDES), CAP);
cap.name = "tapa";
cap.position.y = 1.555;
root.add(cap);

// etiqueta: un trozo de cilindro (un cuarto de vuelta) más alto que ancho, mirando al frente (+z)
const arc = (Math.PI * 90) / 180;
const R = 0.258;
const label = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.55, 6, 1, true, -arc / 2, arc), LABEL);
label.name = "etiqueta";
label.position.y = 0.4;
root.add(label);

// la X de la etiqueta: dos barras cruzadas
for (const [i, rot] of [Math.PI / 4, -Math.PI / 4].entries()) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.04, 0.012), INK);
  bar.name = `x${i + 1}`;
  bar.position.set(0, 0.4, R + 0.004);
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
