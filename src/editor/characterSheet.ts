// Dibuja la hoja de personajes zombi (src/game/characters.ts) con la cámara de la TV: cada personaje de frente y de
// espaldas (mirando a la derecha de la pantalla), quieto y en dos momentos del paso. Se hace al publicar (con la vista
// elegida en el editor) y para la hoja de serie (scripts/characters/sheet.mjs).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CHARACTERS, SHEET_COLS, type Pose } from "@/game/characters";
import { tvDirection, type TvView } from "./layout";

const DIR = "/personajes/";
/** Momento de cada pose: animación y fracción de su duración. */
const POSE_AT: Record<Pose, [string, number]> = { idle: ["idle", 0], walkA: ["walk", 0.25], walkB: ["walk", 0.75] };

/**
 * Franja de la paleta (Textures/colormap.png, 512×512, compartida por todos) que es la piel de cada personaje (la que
 * usa toda la cara; sacada de las UV de "head-mesh") y su tono de verde. Solo se pinta la de ese personaje: en otros
 * la misma franja es pelo o ropa.
 */
const SWATCH = { medio: 320, oscuro: 384, claro: 448 } as const;
const SKIN: Record<string, [keyof typeof SWATCH, number]> = {
  "character-male-a": ["oscuro", 100],
  "character-male-b": ["claro", 84],
  "character-male-c": ["claro", 92],
  "character-male-d": ["claro", 78],
  "character-male-e": ["claro", 96],
  "character-male-f": ["medio", 88],
  "character-female-a": ["oscuro", 104],
  "character-female-b": ["claro", 86],
  "character-female-c": ["medio", 94],
  "character-female-d": ["claro", 80],
  "character-female-e": ["claro", 98],
  "character-female-f": ["claro", 90],
};

/** Copia de la paleta con la piel de este personaje en verde zombi (conserva el sombreado de la paleta). */
function zombieMap(original: THREE.Texture, id: string): THREE.Texture {
  const img = original.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const [swatch, hue] = SKIN[id] ?? ["claro", 90];
  const k = img.width / 512;
  const x0 = Math.round(SWATCH[swatch] * k);
  const y0 = Math.round(384 * k);
  const w = Math.round(64 * k);
  const h = img.height - y0;
  const px = ctx.getImageData(x0, y0, w, h);
  const d = px.data;
  const color = new THREE.Color();
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    color.setHSL(hue / 360, 0.27, 0.2 + lum * 0.36, THREE.SRGBColorSpace); // verde apagado y cadavérico
    const rgb = color.getStyle(THREE.SRGBColorSpace).match(/\d+/g)!.map(Number);
    [d[i], d[i + 1], d[i + 2]] = rgb;
  }
  ctx.putImageData(px, x0, y0);
  ctx.fillStyle = EYE.color; // los ojos (yellowEyes)
  ctx.fillRect(EYE.x * k, EYE.y * k, EYE.size * k, EYE.size * k);
  for (const c2 of Object.keys(UNDEAD) as (keyof typeof UNDEAD)[]) {
    ctx.fillStyle = UNDEAD[c2];
    ctx.fillRect(UNDEAD_X[c2] * k, EYE.y * k, 16 * k, 16 * k);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = original.flipY;
  tex.colorSpace = original.colorSpace;
  tex.magFilter = original.magFilter;
  tex.minFilter = original.minFilter;
  tex.wrapS = original.wrapS;
  tex.wrapT = original.wrapT;
  return tex;
}

/** Píxeles de una textura (para saber de qué color es cada parte del modelo). */
function pixels(tex: THREE.Texture) {
  const img = tex.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

/** Cuadrito amarillo vivo que se pinta en una zona vacía (negra) de la paleta: los ojos de zombi. */
const EYE = { x: 8, y: 8, size: 16, color: "#fff04a" };
/** Colores extra de la paleta para los detalles de muerto viviente (cuencas, sangre, hueso, dientes); cada uno es un cuadrito de 16 px en la fila de arriba. */
const UNDEAD = { dark: "#0c0a10", blood: "#8a1018", bone: "#d8d0b0", teeth: "#efe8c8", rot: "#4a5a2c" } as const;
const UNDEAD_X: Record<keyof typeof UNDEAD, number> = { dark: 32, blood: 56, bone: 80, teeth: 104, rot: 128 };
const uvOf = (c: keyof typeof UNDEAD): [number, number] => [(UNDEAD_X[c] + 8) / 512, (EYE.y + 8) / 512];
const YELLOW_UV = [(EYE.x + EYE.size / 2) / 512, (EYE.y + EYE.size / 2) / 512];

/**
 * Ojos amarillos: son piezas pequeñas y planas pegadas al frente de la cabeza, del mismo color oscuro que el pelo
 * negro (por eso no se puede cambiar en la paleta). Se buscan en la geometría de la cabeza (piezas sueltas, oscuras,
 * planas en la cara y a la altura de los ojos, no de la boca) y se apuntan al amarillo de la paleta.
 */
function yellowEyes(mesh: THREE.Mesh, map: THREE.Texture, eyes: THREE.Vector3[]) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  if (!pos || !uv) return;
  const index = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  // piezas sueltas: vértices unidos por triángulos
  const parent = Array.from({ length: pos.count }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let t = 0; t < index.length; t += 3) {
    const a = find(index[t]);
    parent[find(index[t + 1])] = a;
    parent[find(index[t + 2])] = a;
  }
  const parts = new Map<number, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const r = find(i);
    if (!parts.has(r)) parts.set(r, []);
    parts.get(r)!.push(i);
  }
  const img = pixels(map);
  const lumAt = (i: number) => {
    const x = Math.min(img.width - 1, Math.max(0, Math.floor(uv.getX(i) * img.width)));
    const y = Math.min(img.height - 1, Math.max(0, Math.floor(uv.getY(i) * img.height)));
    const k = (y * img.width + x) * 4;
    return (0.299 * img.data[k] + 0.587 * img.data[k + 1] + 0.114 * img.data[k + 2]) / 255;
  };
  const gone = new Set<number>();
  for (const vs of parts.values()) {
    const xs = vs.map((i) => pos.getX(i));
    const ys = vs.map((i) => pos.getY(i));
    const zs = vs.map((i) => pos.getZ(i));
    const [w, h] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    const yc = (Math.max(...ys) + Math.min(...ys)) / 2;
    // gafas (las lleva solo un personaje): piezas claras, pequeñas y planas a la altura de los ojos, delante de la cara (lentes, puente y
    // patillas). Se quitan para que se vean los ojos amarillos como en los demás; la placa de la cara (h 0,27) y los lados (h 0,22) son más grandes y se quedan
    const light = vs.reduce((a, i) => a + lumAt(i), 0) / vs.length > 0.66;
    if (light && h <= 0.1 && yc > 0.47 && yc < 0.51 && Math.max(...zs) >= 0.14 && Math.max(...zs) <= 0.18 && Math.max(...xs.map(Math.abs)) <= 0.17) {
      for (const i of vs) gone.add(i);
      continue;
    }
    const flat = Math.max(...zs) - Math.min(...zs) < 0.012 && Math.min(...zs) > 0.14;
    const dark = vs.reduce((a, i) => a + lumAt(i), 0) / vs.length < 0.35;
    if (!(flat && dark && w < 0.27 && h < 0.06 && yc > 0.47 && yc < 0.545)) continue;
    // amarillos y un poco más grandes, para que se vean desde lejos
    const xc = (Math.max(...xs) + Math.min(...xs)) / 2;
    // dónde están (en coordenadas de la malla, al frente de la cara) para ponerles el halo de luz en el 3D; una pieza ancha es la banda de los dos ojos
    const front = Math.max(...zs);
    if (w > 0.15) eyes.push(new THREE.Vector3(xc - w * 0.3, yc, front), new THREE.Vector3(xc + w * 0.3, yc, front));
    else eyes.push(new THREE.Vector3(xc, yc, front));
    for (const i of vs) {
      uv.setXY(i, YELLOW_UV[0], YELLOW_UV[1]);
      pos.setXY(i, xc + (pos.getX(i) - xc) * (w > 0.15 ? 1.15 : 1.3), yc + (pos.getY(i) - yc) * 1.3);
    }
  }
  uv.needsUpdate = true;
  pos.needsUpdate = true;
  if (gone.size) {
    const keep: number[] = [];
    for (let t = 0; t < index.length; t += 3) if (!gone.has(index[t])) keep.push(index[t], index[t + 1], index[t + 2]);
    geo.setIndex(keep);
  }
}

/**
 * Objetos que trae en las manos algún personaje del kit y que no queremos (la mujer «a» lleva unas muletas): piezas
 * del cuerpo con los brazos en cruz que salen más allá de las manos (|x| > 0,42), las pintadas con la columna gris de
 * la paleta (el palo) y las azules pegadas a la mano (el agarre).
 */
const PROPS: Record<string, (minAbsX: number, maxAbsX: number, u: number) => boolean> = {
  // muletas: el palo (gris), la punta y el agarre azules que quedan en la mano
  "character-female-a": (minAbsX, maxAbsX, u) => maxAbsX > 0.42 || (u >= 192 && u < 256) || (minAbsX > 0.25 && u >= 320 && u < 384),
};

/** Quita del cuerpo las piezas que `PROPS` marca (se quitan sus triángulos). */
function dropProps(mesh: THREE.Mesh, id: string) {
  const drop = PROPS[id];
  const geo = mesh.geometry;
  if (!drop || !geo.index || !geo.attributes.position || !geo.attributes.uv) return;
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const index = Array.from(geo.index.array);
  const parent = Array.from({ length: pos.count }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let t = 0; t < index.length; t += 3) {
    const a = find(index[t]);
    parent[find(index[t + 1])] = a;
    parent[find(index[t + 2])] = a;
  }
  const parts = new Map<number, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const r = find(i);
    if (!parts.has(r)) parts.set(r, []);
    parts.get(r)!.push(i);
  }
  const gone = new Set<number>();
  for (const vs of parts.values()) {
    const xs = vs.map((i) => Math.abs(pos.getX(i)));
    if (drop(Math.min(...xs), Math.max(...xs), uv.getX(vs[0]) * 512)) for (const i of vs) gone.add(i);
  }
  if (!gone.size) return;
  const keep: number[] = [];
  for (let t = 0; t < index.length; t += 3) if (!gone.has(index[t])) keep.push(index[t], index[t + 1], index[t + 2]);
  geo.setIndex(keep);
}

export type Loaded = {
  root: THREE.Object3D;
  clips: THREE.AnimationClip[];
  /** Centro de cada ojo amarillo (en el espacio del modelo sin escalar, al frente de la cara): ahí va el halo de luz del 3D. */
  eyes: THREE.Vector3[];
};

const emissiveCache = new WeakMap<THREE.Texture, THREE.Texture>();
/**
 * Mapa emisivo de un zombi: la paleta oscurecida al 32 % (la luz propia suave de todo el cuerpo) con el cuadrito amarillo de los ojos
 * a plena luz: los ojos brillan como neón aunque la escena sea de noche.
 */
export function eyeEmissiveMap(map: THREE.Texture): THREE.Texture {
  const cached = emissiveCache.get(map);
  if (cached) return cached;
  const img = map.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.68)";
  ctx.fillRect(0, 0, c.width, c.height);
  const k = img.width / 512;
  ctx.fillStyle = "#ffee33";
  ctx.fillRect(EYE.x * k, EYE.y * k, EYE.size * k, EYE.size * k);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = map.flipY;
  tex.colorSpace = map.colorSpace;
  tex.wrapS = map.wrapS;
  tex.wrapT = map.wrapT;
  emissiveCache.set(map, tex);
  return tex;
}
let loading: Promise<Loaded[]> | null = null;

/**
 * Luz neón amarilla en los ojos: en la casilla (x, y, w, h) del dibujo busca los píxeles amarillo vivo (los ojos de `yellowEyes`) y
 * pinta encima, en suma de luz, esos mismos píxeles muy desenfocados (un halo ancho y otro más pegado) más el núcleo más claro.
 * Se hace sobre el dibujo ya hecho porque el 3D no tiene resplandor; así vale para los retratos, los sprites y el respaldo de imagen.
 */
function eyeGlow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    // el amarillo de los ojos ya dibujado es limón (tono 52°-64°); la ropa y el pelo amarillos son más naranjas (tono < 50°), así que no brillan
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const hue = max === min ? 0 : max === r ? (60 * (g - b)) / (max - min) : max === g ? 60 * (2 + (b - r) / (max - min)) : 60 * (4 + (r - g) / (max - min));
    const yellow = d[i + 3] > 120 && max > 175 && (max - min) / max > 0.65 && hue >= 52 && hue <= 64;
    if (yellow) {
      [d[i], d[i + 1], d[i + 2], d[i + 3]] = [255, 234, 40, 255];
      n++;
    } else d[i + 3] = 0;
  }
  if (!n) return;
  const mask = document.createElement("canvas");
  mask.width = w;
  mask.height = h;
  mask.getContext("2d")!.putImageData(img, 0, 0);
  const s = w / 192; // el dibujo puede ir a doble resolución
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  for (const [blur, alpha] of [[9 * s, 0.75], [4.5 * s, 0.9], [2 * s, 0.9]] as const) {
    ctx.filter = `blur(${blur}px)`;
    ctx.globalAlpha = alpha;
    ctx.drawImage(mask, x, y);
  }
  ctx.restore();
}


type Piece = { c: keyof typeof UNDEAD; x: number; y: number; z: number; w: number; h: number; d?: number; rot?: number };

/**
 * Añade piezas sueltas (cajas de un solo color de la paleta) a una malla con esqueleto, atadas al hueso `bone`: así siguen a la cabeza o al torso
 * cuando se anima, tanto en la hoja de sprites como en el 3D en vivo. Las posiciones son las de la malla en reposo.
 */
function addPieces(mesh: THREE.Mesh, bone: number, pieces: Piece[]) {
  if (!pieces.length) return;
  const base = mesh.geometry;
  const parts: THREE.BufferGeometry[] = [base];
  for (const pc of pieces) {
    const g = new THREE.BoxGeometry(pc.w, pc.h, pc.d ?? 0.012);
    if (pc.rot) g.rotateZ(pc.rot);
    g.translate(pc.x, pc.y, pc.z);
    const n = g.attributes.position.count;
    const [u, v] = uvOf(pc.c);
    const uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) [uv[i * 2], uv[i * 2 + 1]] = [u, v];
    const out = new THREE.BufferGeometry();
    out.setIndex(g.index!.array.length ? Array.from(g.index!.array) : []);
    for (const name of Object.keys(base.attributes)) {
      const a = base.attributes[name] as THREE.BufferAttribute;
      if (name === "position" || name === "normal") out.setAttribute(name, g.attributes[name]);
      else if (name.startsWith("uv")) out.setAttribute(name, new THREE.BufferAttribute(uv.slice(), 2));
      else if (name === "skinIndex") out.setAttribute(name, new THREE.BufferAttribute(new Uint16Array(n * 4).map((_, i) => (i % 4 === 0 ? bone : 0)), 4));
      else if (name === "skinWeight") out.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
      else out.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n * a.itemSize), a.itemSize));
    }
    parts.push(out);
  }
  mesh.geometry = mergeGeometries(parts, false) ?? base;
}

/** Cara de muerto viviente: cuencas oscuras, boca con dientes y una herida distinta según el personaje (`variant`). */
function undeadFace(mesh: THREE.Mesh, eyes: THREE.Vector3[], variant: number) {
  const skinned = mesh as THREE.SkinnedMesh;
  const joint = (mesh.geometry.attributes.skinIndex?.getX(0) ?? 6) | 0;
  if (!eyes.length || !skinned.isSkinnedMesh) return;
  const zf = Math.max(...eyes.map((e) => e.z)) - 0.003;
  const yc = eyes[0].y;
  const pieces: Piece[] = [];
  for (const e of eyes) pieces.push({ c: "dark", x: e.x, y: e.y, z: zf - 0.006, w: 0.105, h: 0.095 });
  // boca: tajo oscuro con tres dientes
  pieces.push({ c: "dark", x: 0, y: yc - 0.115, z: zf - 0.006, w: 0.13, h: 0.036 });
  for (const dx of [-0.04, 0, 0.04]) pieces.push({ c: "teeth", x: dx, y: yc - 0.104, z: zf - 0.002, w: 0.024, h: 0.02, d: 0.014 });
  const side = variant % 2 ? 1 : -1;
  switch (variant % 6) {
    case 0: // cicatriz cosida en la mejilla
      pieces.push({ c: "blood", x: side * 0.1, y: yc - 0.06, z: zf - 0.004, w: 0.024, h: 0.17, rot: 0.5 * side });
      for (const t of [-0.05, 0, 0.05]) pieces.push({ c: "dark", x: side * (0.1 - t * 0.5), y: yc - 0.06 + t, z: zf - 0.001, w: 0.07, h: 0.01, rot: 0.5 * side });
      break;
    case 1: // hueso al aire en la mejilla
      pieces.push({ c: "blood", x: side * 0.105, y: yc - 0.05, z: zf - 0.005, w: 0.1, h: 0.09 });
      pieces.push({ c: "bone", x: side * 0.105, y: yc - 0.05, z: zf - 0.001, w: 0.07, h: 0.055, d: 0.014 });
      break;
    case 2: // frente cosida
      pieces.push({ c: "blood", x: 0, y: yc + 0.13, z: zf - 0.004, w: 0.24, h: 0.022 });
      for (const dx of [-0.08, -0.027, 0.027, 0.08]) pieces.push({ c: "dark", x: dx, y: yc + 0.13, z: zf - 0.001, w: 0.012, h: 0.07 });
      break;
    case 3: // sangre que escurre de la boca
      pieces.push({ c: "blood", x: -0.03, y: yc - 0.165, z: zf - 0.004, w: 0.04, h: 0.08 });
      pieces.push({ c: "blood", x: 0.045, y: yc - 0.15, z: zf - 0.004, w: 0.03, h: 0.05 });
      break;
    case 4: // piel podrida a manchas
      pieces.push({ c: "rot", x: side * 0.1, y: yc + 0.1, z: zf - 0.004, w: 0.09, h: 0.075 });
      pieces.push({ c: "rot", x: -side * 0.08, y: yc - 0.06, z: zf - 0.004, w: 0.06, h: 0.05 });
      break;
    default: // herida abierta en la frente con hueso
      pieces.push({ c: "blood", x: side * 0.07, y: yc + 0.14, z: zf - 0.004, w: 0.13, h: 0.085 });
      pieces.push({ c: "bone", x: side * 0.07, y: yc + 0.14, z: zf - 0.001, w: 0.08, h: 0.05, d: 0.014 });
  }
  addPieces(mesh, joint, pieces);
}

/** Pecho de muerto viviente: camisa rota con las costillas al aire y manchas de sangre (atado al hueso del torso). */
function undeadBody(mesh: THREE.Mesh, variant: number) {
  const skinned = mesh as THREE.SkinnedMesh;
  if (!skinned.isSkinnedMesh) return;
  const joint = skinned.skeleton.bones.findIndex((b) => b.name === "torso");
  if (joint < 0) return;
  const z = 0.115;
  const side = variant % 2 ? 1 : -1;
  // camisa rota: un roto pequeño con sangre en el borde, costillas al aire y un jirón oscuro
  const pieces: Piece[] = [
    { c: "blood", x: side * 0.05, y: 0.215, z, w: 0.1, h: 0.075, d: 0.014, rot: 0.25 * side },
    { c: "bone", x: side * 0.05, y: 0.215, z: z + 0.003, w: 0.065, h: 0.05, d: 0.014, rot: 0.25 * side },
  ];
  for (const dy of [-0.014, 0.014]) pieces.push({ c: "dark", x: side * 0.05, y: 0.215 + dy, z: z + 0.007, w: 0.065, h: 0.008, d: 0.014, rot: 0.25 * side });
  if (variant % 3 === 0) pieces.push({ c: "blood", x: -side * 0.07, y: 0.12, z, w: 0.035, h: 0.05, d: 0.014 });
  addPieces(mesh, joint, pieces);
}

/** Los 12 personajes ya convertidos en zombi (piel verde y ojos amarillos), con sus animaciones. */
export function loadAll(): Promise<Loaded[]> {
  loading ??= Promise.all(
    CHARACTERS.map(
      (id) =>
        new Promise<Loaded>((ok, fail) =>
          new GLTFLoader().load(
            DIR + id + ".glb",
            (g) => {
              const maps = new Map<THREE.Texture, THREE.Texture>();
              const eyes: THREE.Vector3[] = [];
              let headMesh: THREE.Mesh | null = null;
              g.scene.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                mesh.frustumCulled = false; // con la animación la caja de la malla no es la de reposo
                const orig = [mesh.material].flat()[0] as THREE.MeshStandardMaterial;
                if (/head/i.test(mesh.name) && orig.map) {
                  yellowEyes(mesh, orig.map, eyes);
                  undeadFace(mesh, eyes, CHARACTERS.indexOf(id));
                  headMesh = mesh;
                }
                if (/body/i.test(mesh.name)) {
                  dropProps(mesh, id);
                  undeadBody(mesh, CHARACTERS.indexOf(id));
                }
                mesh.material = ([mesh.material].flat() as THREE.MeshStandardMaterial[]).map((orig) => {
                  const m = orig.clone();
                  if ("metalness" in m) m.metalness = 0;
                  if (m.map) {
                    if (!maps.has(m.map)) maps.set(m.map, zombieMap(m.map, id));
                    m.map = maps.get(m.map)!;
                  }
                  return m;
                }) as unknown as THREE.Material;
                if (Array.isArray(mesh.material) && mesh.material.length === 1) mesh.material = mesh.material[0];
              });
              g.scene.updateMatrixWorld(true);
              if (headMesh) for (const e of eyes) e.applyMatrix4((headMesh as THREE.Mesh).matrixWorld);
              ok({ root: g.scene, clips: g.animations, eyes });
            },
            undefined,
            fail,
          ),
        ),
    ),
  );
  return loading;
}

/**
 * La hoja: una fila por personaje (orden de CHARACTERS) y SHEET_COLS columnas (frente: quieto, paso A, paso B;
 * espaldas: lo mismo). Devuelve el lienzo y la altura de los pies en cada dibujo (fracción desde arriba).
 */
export async function renderCharacterSheet(view: TvView, cw = 192, ch = 288): Promise<{ canvas: HTMLCanvasElement; feet: number; span: number }> {
  const chars = await loadAll();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(cw, ch, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#ffffff", "#6d6d78", 2.1));
  const sun = new THREE.DirectionalLight("#ffffff", 1.5);
  const dir = new THREE.Vector3(...tvDirection(view));
  // luz de la misma esquina que la del tablero, algo por encima de la cámara
  sun.position.copy(dir).multiplyScalar(10).add(new THREE.Vector3(2, 6, -1));
  scene.add(sun);
  const holder = new THREE.Group();
  scene.add(holder);

  // todos con la misma altura (1) y el mismo encuadre: los pies siempre en el mismo sitio del dibujo
  const sizes = chars.map((c) => new THREE.Box3().setFromObject(c.root).getSize(new THREE.Vector3()));
  const W = Math.max(...sizes.map((s, i) => Math.max(s.x, s.z) / sizes[i].y));
  const el = (view.el * Math.PI) / 180;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -50, 50);
  camera.position.copy(dir);
  camera.lookAt(0, 0, 0);
  // en la cámara, los pies (0,0,0) quedan en y = 0; lo más alto (la cabeza) en ~cos(el), y el ancho del paso
  // hacia delante y atrás en ±W/2·sin(el)
  const below = (W / 2) * Math.sin(el) + 0.06;
  const above = Math.cos(el) + (W / 2) * Math.sin(el) + 0.08;
  let span = above + below;
  const half = Math.max((W * 0.75) / 2, ((span * cw) / ch) / 2);
  span = Math.max(span, (2 * half * ch) / cw);
  Object.assign(camera, { left: -half, right: half, bottom: -below - (span - above - below), top: above });
  camera.updateProjectionMatrix();
  const feet = above / (above - camera.bottom);

  const sheet = document.createElement("canvas");
  sheet.width = cw * SHEET_COLS;
  sheet.height = ch * chars.length;
  const ctx = sheet.getContext("2d")!;
  const az = (view.az * Math.PI) / 180;
  for (const [row, c] of chars.entries()) {
    const size = sizes[row];
    const model = c.root;
    model.scale.setScalar(1 / size.y);
    model.position.set(0, 0, 0);
    holder.add(model);
    const mixer = new THREE.AnimationMixer(model);
    for (const [k, pose] of (["idle", "walkA", "walkB"] as Pose[]).entries()) {
      const [name, at] = POSE_AT[pose];
      const clip = c.clips.find((a) => a.name === name);
      mixer.stopAllAction();
      if (clip) {
        mixer.clipAction(clip).play();
        mixer.setTime(clip.duration * at);
      }
      // de frente (hacia abajo-derecha de la pantalla) y de espaldas (hacia arriba-derecha)
      for (const [j, turn] of [Math.PI / 4, (3 * Math.PI) / 4].entries()) {
        holder.rotation.y = az + turn;
        renderer.render(scene, camera);
        ctx.drawImage(renderer.domElement, (j * 3 + k) * cw, row * ch);
        if (j === 0) eyeGlow(ctx, (j * 3 + k) * cw, row * ch, cw, ch); // solo de frente: de espaldas no se ven los ojos
      }
    }
    mixer.stopAllAction();
    holder.remove(model);
  }
  renderer.dispose();
  renderer.forceContextLoss();
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return { canvas: sheet, feet: r3(feet), span: r3(camera.top - camera.bottom) };
}
