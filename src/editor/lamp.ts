// Detecta en un modelo las partes que "son luz" (los cuadritos amarillos de los faroles, la llama de una vela…) mirando
// el color de su textura. Sirve para dos cosas: poner el punto de luz ahí (y no en mitad del poste) y hacer que esas
// partes brillen con un mapa emisivo.
import * as THREE from "three";

export type Lamp = {
  /** Centro de las partes luminosas, en coordenadas del modelo sin escalar; null si no tiene. */
  anchor: THREE.Vector3 | null;
  /** Mapa emisivo: la textura original dejando solo los colores de luz y el resto en negro. */
  emissiveMap: THREE.CanvasTexture | null;
};

/** Amarillo de luz de los kits (Kenney 255,192,68; KayKit 248,208,96): tono amarillo, saturado y muy claro. */
export function isGlowColor(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const d = max - min;
  if (d === 0 || max < 0.9) return false;
  const s = d / max;
  let h: number;
  if (max === r / 255) h = ((g - b) / 255 / d) % 6;
  else if (max === g / 255) h = (b - r) / 255 / d + 2;
  else h = (r - g) / 255 / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h >= 36 && h <= 54 && s >= 0.45 && s <= 0.85;
}

type Pixels = { data: Uint8ClampedArray; w: number; h: number; mask: HTMLCanvasElement };

/** Lee los píxeles de la textura (y deja lista la copia con solo los colores de luz). */
function readPixels(image: CanvasImageSource & { width: number; height: number }): Pixels {
  const w = image.width;
  const h = image.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < src.data.length; i += 4) {
    const glow = isGlowColor(src.data[i], src.data[i + 1], src.data[i + 2]);
    out.data[i] = glow ? src.data[i] : 0;
    out.data[i + 1] = glow ? src.data[i + 1] : 0;
    out.data[i + 2] = glow ? src.data[i + 2] : 0;
    out.data[i + 3] = 255;
  }
  const mask = document.createElement("canvas");
  mask.width = w;
  mask.height = h;
  mask.getContext("2d")!.putImageData(out, 0, 0);
  return { data: src.data, w, h, mask };
}

/** Analiza un modelo ya cargado. */
export function findLamp(root: THREE.Object3D): Lamp {
  root.updateMatrixWorld(true);
  const sum = new THREE.Vector3();
  let count = 0;
  let emissiveMap: THREE.CanvasTexture | null = null;
  const cache = new Map<unknown, Pixels>();
  const v = new THREE.Vector3();

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const tex = mat?.map;
    const image = tex?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
    const uv = mesh.geometry.getAttribute("uv");
    const pos = mesh.geometry.getAttribute("position");
    if (!tex || !image || !uv || !pos) return;
    let px = cache.get(image);
    if (!px) {
      px = readPixels(image);
      cache.set(image, px);
    }
    let found = 0;
    for (let i = 0; i < uv.count; i++) {
      const x = Math.min(px.w - 1, Math.max(0, Math.floor(uv.getX(i) * px.w)));
      // glTF no voltea la textura (flipY = false); con flipY el origen de v es el de abajo
      const t = tex.flipY ? 1 - uv.getY(i) : uv.getY(i);
      const y = Math.min(px.h - 1, Math.max(0, Math.floor(t * px.h)));
      const k = (y * px.w + x) * 4;
      if (isGlowColor(px.data[k], px.data[k + 1], px.data[k + 2])) {
        sum.add(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
        count++;
        found++;
      }
    }
    if (found && !emissiveMap) {
      emissiveMap = new THREE.CanvasTexture(px.mask);
      emissiveMap.flipY = tex.flipY;
      emissiveMap.colorSpace = THREE.SRGBColorSpace;
      emissiveMap.channel = tex.channel;
      emissiveMap.wrapS = tex.wrapS;
      emissiveMap.wrapT = tex.wrapT;
    }
  });
  return { anchor: count ? sum.multiplyScalar(1 / count) : null, emissiveMap };
}
