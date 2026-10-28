// Escena 3D del tablero de Ebrionautas ("planeta después de la fiesta"). Se renderiza una vez
// (scripts/board3d/render.mjs) a una imagen que la TV usa de fondo: la TV no necesita WebGL.
//
// Cuadrícula → mundo: x = gx, z = gy, y hacia arriba; el césped está en y = 0.
// La cámara ortográfica reproduce la proyección 2:1 de IsoBoard (sx/sy), así que las fichas
// se colocan encima con las mismas cuentas.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BOARD, type Tile } from "@/game/board";
import { DECOR, HEIGHT, type Deco } from "@/game/decor";
import { ISLAND, ISO_VIEW as VIEW, isoPos, routeCurve } from "@/game/isoPath";
import { PLAYER_COLORS, TILE_STYLE } from "@/game/tileStyle";

// --- Proyección (igual que IsoBoard) -------------------------------------------
const K = 50 * Math.SQRT2; // píxeles SVG por unidad de mundo en horizontal
const { x0: I0, x1: IX, y1: IY, thickness: ISLAND_T } = ISLAND;
const TILE_TOP = 10 / (K * Math.cos(Math.PI / 6)); // 10 px de canto, como TILE_T en IsoBoard

// --- Paleta y materiales ----------------------------------------------------------
const mat = (color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts });
const glow = (color: string, intensity = 1.6) => mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.4 });

// Paleta de terror: panteón abandonado de noche. Hierba muerta, tierra oscura, piedra fría, luz de luna y fuego.
const C = {
  grass: "#3c4434",
  grassLight: "#434c3a",
  dirt: "#3a302b",
  dirtDark: "#2a2320",
  cream: "#d9d2c3", // hueso viejo
  white: "#e8e2d4",
  gold: "#b8a26a",
  calimocho: "#7a1022", // sangre / vino
  toxic: "#8dff6a", // brillo verdoso de lo sobrenatural
};

function shadowed<T extends THREE.Object3D>(o: T): T {
  o.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return o;
}

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}

// --- Isla y casillas -------------------------------------------------------------
function roundedRect(x0: number, z0: number, x1: number, z1: number, r: number) {
  // Shape en (x, -z): tras rotar -90° en X queda en el plano del suelo.
  const s = new THREE.Shape();
  s.moveTo(x0 + r, -z0);
  s.lineTo(x1 - r, -z0);
  s.quadraticCurveTo(x1, -z0, x1, -z0 - r);
  s.lineTo(x1, -z1 + r);
  s.quadraticCurveTo(x1, -z1, x1 - r, -z1);
  s.lineTo(x0 + r, -z1);
  s.quadraticCurveTo(x0, -z1, x0, -z1 + r);
  s.lineTo(x0, -z0 - r);
  s.quadraticCurveTo(x0, -z0, x0 + r, -z0);
  return s;
}

function checkerTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const g = cv.getContext("2d")!;
  g.fillStyle = C.grass;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = C.grassLight;
  g.fillRect(0, 0, 32, 32);
  g.fillRect(32, 32, 32, 32);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.5, 0.5);
  t.offset.set(0.25, 0.25);
  t.magFilter = THREE.NearestFilter;
  return t;
}

function island() {
  const g = new THREE.Group();
  const shape = roundedRect(I0, I0, IX, IY, 0.9);
  const depth = ISLAND_T / (K * Math.cos(Math.PI / 6));
  const dirt = new THREE.ExtrudeGeometry(shape, { depth: depth - 0.12, bevelEnabled: false, curveSegments: 16 });
  dirt.rotateX(-Math.PI / 2);
  g.add(mesh(dirt, mat(C.dirt), 0, -depth, 0));
  // franja oscura de tierra bajo el césped
  const band = new THREE.ExtrudeGeometry(roundedRect(I0 + 0.02, I0 + 0.02, IX - 0.02, IY - 0.02, 0.88), { depth: 0.05, bevelEnabled: false, curveSegments: 16 });
  band.rotateX(-Math.PI / 2);
  g.add(mesh(band, mat(C.dirtDark), 0, -0.2, 0));
  const grass = new THREE.ExtrudeGeometry(roundedRect(I0 + 0.06, I0 + 0.06, IX - 0.06, IY - 0.06, 0.84), {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 4,
    curveSegments: 16,
  });
  grass.rotateX(-Math.PI / 2);
  g.add(mesh(grass, mat("#ffffff", { map: checkerTexture(), roughness: 0.9 }), 0, -0.16, 0));
  return shadowed(g);
}

/** Símbolo pintado en la casilla, dibujado en un canvas (mismas formas que antes en SVG). */
function glyphTexture(type: Tile["type"], color: string, hole: string) {
  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d")!;
  g.setTransform(size / 64, 0, 0, size / 64, size / 2, size / 2); // unidades locales ±32
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineCap = g.lineJoin = "round";
  const fill = (d: string, c = color) => {
    g.fillStyle = c;
    g.fill(new Path2D(d));
  };
  const stroke = (d: string, w = 7) => {
    g.lineWidth = w;
    g.stroke(new Path2D(d));
  };
  const circle = (x: number, y: number, r: number) => `M${x + r} ${y} A${r} ${r} 0 1 0 ${x - r} ${y} A${r} ${r} 0 1 0 ${x + r} ${y} Z`;
  const text = (t: string, px = 60) => {
    g.font = `900 ${px}px "DejaVu Sans", Arial, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(t, 0, 3);
  };
  switch (type) {
    case "SALIDA":
      fill("M-26 -10 H4 V-24 L28 0 L4 24 V10 H-26 Z");
      break;
    case "OCA": {
      const pts = Array.from({ length: 10 }, (_, k) => {
        const r = k % 2 ? 12 : 28;
        const a = (Math.PI / 5) * k - Math.PI / 2;
        return `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
      });
      fill(`M${pts.join(" L")} Z`);
      break;
    }
    case "MUERTE":
      fill(circle(0, -6, 22));
      fill("M-13 6 H13 V20 Q13 24 9 24 H-9 Q-13 24 -13 20 Z");
      fill(circle(-9, -6, 6.5), hole);
      fill(circle(9, -6, 6.5), hole);
      break;
    case "POSADA":
      fill("M0 -28 C14 -8 22 2 22 10 A22 22 0 0 1 -22 10 C-22 2 -14 -8 0 -28 Z");
      break;
    case "A_BEBER":
      fill("M-20 -26 H20 Q20 4 0 6 Q-20 4 -20 -26 Z");
      fill("M-3 4 H3 V20 H-3 Z");
      fill("M-14 22 A14 4.5 0 1 0 14 22 A14 4.5 0 1 0 -14 22 Z");
      break;
    case "DUELO":
      text("VS", 34);
      break;
    case "CULTURAL":
      text("?");
      break;
    case "REGLA":
      text("!");
      break;
    case "HIPNOSIS":
      stroke("M0 0 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0 a20 20 0 1 1 40 0", 6);
      break;
    case "CARCEL":
      stroke("M-15 -22 H15 Q22 -22 22 -15 V15 Q22 22 15 22 H-15 Q-22 22 -22 15 V-15 Q-22 -22 -15 -22 Z M-8 -22 V22 M8 -22 V22");
      break;
    case "PATINAZO":
      fill(circle(0, 0, 14));
      g.save();
      g.rotate(-0.35);
      stroke("M-29 0 A29 9 0 1 0 29 0 A29 9 0 1 0 -29 0", 5);
      g.restore();
      break;
    case "POSICION":
      fill(circle(-14, 0, 12));
      fill(circle(14, 0, 12));
      fill(circle(-10, 2, 5), hole);
      fill(circle(18, 2, 5), hole);
      break;
    case "RASGO":
      stroke(circle(-5, -5, 14));
      stroke("M6 6 L22 22", 9);
      break;
    case "ESCLAVO":
      g.save();
      g.rotate(-0.44);
      stroke("M-26 0 A16 9 0 1 0 6 0 A16 9 0 1 0 -26 0 M-6 0 A16 9 0 1 0 26 0 A16 9 0 1 0 -6 0", 6);
      g.restore();
      break;
    case "RETO":
      fill("M-9 -19 A9 9 0 0 1 9 -19 V-7 A9 9 0 0 1 -9 -7 Z");
      stroke("M-16 -4 Q-16 14 0 14 Q16 14 16 -4 M0 14 V24 M-10 24 H10", 5);
      break;
    case "LABERINTO":
      fill(circle(-12, 8, 12));
      fill(circle(13, 9, 10));
      fill(circle(0, -13, 13));
      break;
    case "META":
      break;
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Casillas redondas al estilo Mario Party: un disco de color con borde claro, un poco elevado sobre el sendero.
const RIM_GEO = new THREE.LatheGeometry(
  [[0, 0], [0.45, 0], [0.47, 0.03], [0.47, TILE_TOP - 0.03], [0.45, TILE_TOP], [0, TILE_TOP]].map(([x, y]) => new THREE.Vector2(x, y)),
  48,
);
const DISC_GEO = new THREE.CylinderGeometry(0.41, 0.41, 0.02, 48);
const GLYPH_PLANE = new THREE.PlaneGeometry(0.56, 0.56).rotateX(-Math.PI / 2);

/** Una losa con su símbolo pintado, centrada en (x, z). */
function tile(type: Tile["type"], x: number, z: number) {
  const g = new THREE.Group();
  const s = TILE_STYLE[type];
  const colored = !["RETO", "RASGO", "POSICION", "CULTURAL"].includes(type);
  const top = colored ? new THREE.Color(s.bg[0]).lerp(new THREE.Color(s.bg[1]), 0.5) : new THREE.Color(C.cream);
  // símbolo blanco sobre losas de color; sobre las claras (crema, duelo), del color de la casilla o azul tinta
  const light = top.r * 0.3 + top.g * 0.59 + top.b * 0.11 > 0.8;
  const ink = !colored ? s.bg[1] : light ? "#5468a8" : "#ffffff";
  // un poco de brillo propio para que las casillas se lean de noche, como neón suave
  g.add(shadowed(mesh(RIM_GEO, mat("#f6ecdc", { roughness: 0.5, emissive: "#f6ecdc", emissiveIntensity: 0.12 }), x, 0, z)));
  g.add(shadowed(mesh(DISC_GEO, new THREE.MeshStandardMaterial({ color: top, roughness: 0.45, emissive: top, emissiveIntensity: 0.25 }), x, TILE_TOP - 0.005, z)));
  const decal = new THREE.MeshStandardMaterial({
    map: glyphTexture(type, ink, "#" + top.getHexString()),
    transparent: true,
    roughness: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
  const m = mesh(GLYPH_PLANE, decal, x, TILE_TOP + 0.008, z);
  m.receiveShadow = true;
  g.add(m);
  return g;
}

/** Sendero de tierra apisonada bajo las casillas, siguiendo la curva del recorrido. */
function trail() {
  // tira plana sobre el suelo: a cada punto de la curva, un vértice a cada lado (perpendicular en el plano)
  const pts = routeCurve(40);
  const half = 0.34;
  const pos: number[] = [];
  const idx: number[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[Math.min(i + 1, pts.length - 1)];
    const tx = b.gx - a.gx;
    const tz = b.gy - a.gy;
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len;
    const nz = tx / len;
    pos.push(p.gx + nx * half, 0.012, p.gy + nz * half, p.gx - nx * half, 0.012, p.gy - nz * half);
    if (i > 0) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = mesh(geo, mat("#7d6274", { roughness: 0.95, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  return m;
}

function tiles() {
  const g = new THREE.Group();
  g.add(trail());
  for (const t of BOARD) {
    if (t.type === "META") continue;
    const { gx, gy } = isoPos(t.n);
    g.add(tile(t.type, gx, gy));
  }
  return g;
}

// --- Decoración ----------------------------------------------------------------------
const sphere = (r: number, color: string | THREE.Material, x = 0, y = 0, z = 0, seg = 24) =>
  mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), typeof color === "string" ? mat(color) : color, x, y, z);
const cyl = (rt: number, rb: number, h: number, color: string | THREE.Material, x = 0, y = 0, z = 0, seg = 16) =>
  mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === "string" ? mat(color) : color, x, y + h / 2, z);

/** Variación estable por posición (sin aleatorio: el render sale igual cada vez). */
const vary = (gx: number, gy: number, k = 1) => {
  const v = Math.sin(gx * 12.9898 + gy * 78.233 + k * 3.1) * 43758.5453;
  return v - Math.floor(v);
};

// --- Modelos 3D del Graveyard Kit de Kenney (CC0, scripts/board3d/models/graveyard) ---------
const KENNEY = [
  "pine", "pine-crooked", "pine-fall", "pine-fall-crooked", "gravestone-round", "gravestone-cross", "gravestone-decorative",
  "gravestone-bevel", "gravestone-broken", "cross-wood", "candle-multiple", "candle", "altar-stone", "crypt-large",
  "crypt-large-roof", "grave", "shovel-dirt", "iron-fence", "iron-fence-border-column", "lightpost-single", "lantern-candle",
  "urn-round", "fire-basket", "rocks", "iron-fence-damaged", "fence-damaged", "fence", "stone-wall-damaged", "stone-wall",
  "stone-wall-column", "debris", "debris-wood", "coffin-old", "coffin", "rocks-tall", "trunk", "trunk-long", "gravestone-debris",
  "pillar-obelisk", "character-zombie",
] as const;
type KenneyModel = (typeof KENNEY)[number];
const models = new Map<KenneyModel, THREE.Object3D>();

async function loadModels() {
  const loader = new GLTFLoader();
  await Promise.all(KENNEY.map(async (name) => models.set(name, (await loader.loadAsync(`/models/graveyard/${name}.glb`)).scene)));
}

/** Copia de un modelo, escalada para que mida `height` de alto (en casillas) y apoyada en el suelo. */
function kenney(name: KenneyModel, height: number, turn = 0) {
  const o = models.get(name)!.clone(true);
  const box = new THREE.Box3().setFromObject(o);
  o.scale.setScalar(height / (box.max.y - box.min.y));
  o.position.y = -box.min.y * o.scale.y;
  o.rotation.y = turn;
  const g = new THREE.Group();
  g.add(o);
  return g;
}

/** Altura de la parte de arriba de un objeto (para poner cosas encima). */
const topOf = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).max.y;

/** Árbol muerto low poly: tronco retorcido y ramas peladas, sin hojas (siempre igual para la misma posición). */
function deadTree(v: number) {
  const g = new THREE.Group();
  const bark = mat("#3b3530", { flatShading: true, roughness: 1 });
  const branch = (len: number, r: number, depth: number, seed: number): THREE.Object3D => {
    const b = new THREE.Group();
    const m = mesh(new THREE.CylinderGeometry(r * 0.6, r, len, 6), bark, 0, len / 2, 0);
    b.add(m);
    if (depth > 0) {
      const n = depth >= 2 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const child = branch(len * 0.62, r * 0.6, depth - 1, seed * 7 + k);
        child.position.y = len * (0.55 + 0.4 * ((k + 1) / n));
        child.rotation.set(0.6 + ((seed + k) % 3) * 0.18, (seed * 2.3 + k * 2.1) % 6.28, 0);
        b.add(child);
      }
    }
    return b;
  };
  const trunk = branch(1, 0.2, 3, Math.floor(v * 10) + 1);
  trunk.rotation.z = (v - 0.5) * 0.25;
  g.add(trunk);
  // raíces
  for (let k = 0; k < 4; k++) {
    const root = mesh(new THREE.ConeGeometry(0.07, 0.35, 5), bark, 0, 0.04, 0);
    root.rotation.set(Math.PI / 2.4, (k / 4) * Math.PI * 2 + v, 0);
    root.translateY(0.12);
    g.add(root);
  }
  return g;
}

/** Mausoleo: la cripta grande con su tejado y una cruz. */
function mausoleum() {
  const g = kenney("crypt-large", 0.62, Math.PI / 2);
  const roof = kenney("crypt-large-roof", 0.3, Math.PI / 2);
  roof.position.y = topOf(g) - 0.02;
  // el tejado se escala por su altura: hay que igualarlo al ancho de la cripta
  const wCrypt = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  const wRoof = new THREE.Box3().setFromObject(roof).getSize(new THREE.Vector3());
  roof.scale.multiplyScalar(Math.max(wCrypt.x, wCrypt.z) / Math.max(wRoof.x, wRoof.z));
  g.add(roof);
  return g;
}

/** Tumba de tierra recién cavada con su cruz de madera en la cabecera (mirando a la cámara). */
function grave() {
  const g = kenney("grave", 0.12);
  g.add(kenney("cross-wood", 0.5).translateZ(-0.42));
  return g;
}

function sign() {
  const g = new THREE.Group();
  const wood = mat("#7a4a2c");
  g.add(cyl(0.025, 0.025, 0.5, wood));
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 96;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#6b3f2a";
  c.fillRect(0, 0, 256, 96);
  c.fillStyle = "#ffcf6b";
  c.font = '900 50px "DejaVu Sans", Arial, sans-serif';
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("PANTEÓN", 128, 52);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = mesh(new RoundedBoxGeometry(0.62, 0.24, 0.04, 2, 0.02), [wood, wood, wood, wood, mat("#ffffff", { map: tex }), wood] as unknown as THREE.Material, 0, 0.5, 0.03);
  board.rotation.y = Math.PI / 4; // de cara a la cámara
  g.add(board);
  return g;
}

/** Lápida partida con sus escombros. */
function brokenTomb() {
  const g = kenney("gravestone-debris", 1);
  return g;
}

function decoration(d: Deco) {
  const v = vary(d.gx, d.gy);
  const builders: Record<Deco["kind"], () => THREE.Object3D> = {
    deadTree: () => deadTree(v),
    lantern: () => kenney("lightpost-single", 1),
    crypt: () => mausoleum(),
    wall: () => kenney("stone-wall-damaged", 1),
    tombstone: () => kenney((["gravestone-round", "gravestone-cross", "gravestone-decorative", "gravestone-bevel", "gravestone-broken"] as const)[Math.floor(v * 5)], 1),
    brokenTomb: () => brokenTomb(),
    cross: () => kenney("cross-wood", 1),
    candles: () => kenney("candle-multiple", 1),
    fire: () => kenney("fire-basket", 1),
    coffin: () => kenney(v > 0.5 ? "coffin-old" : "coffin", 1),
    debris: () => kenney(v > 0.5 ? "debris" : "debris-wood", 1),
    rocks: () => kenney(v > 0.5 ? "rocks" : "rocks-tall", 1),
    stump: () => kenney(v > 0.5 ? "trunk" : "trunk-long", 1),
    grave: () => grave(),
    sign: () => sign(),
  };
  const o = builders[d.kind]();
  // cada objeto mide lo que dice la tabla HEIGHT de decor.ts (la misma que usa el test); los árboles varían un poco
  o.scale.multiplyScalar((HEIGHT[d.kind] * (d.kind === "deadTree" ? 0.85 + v * 0.3 : 1)) / topOf(o));
  o.position.set(d.gx, 0, d.gy);
  o.rotation.y += d.turn ?? 0;
  // solo la vegetación lleva una variación mínima de giro (regla: alineado a la cuadrícula)
  if (d.kind === "deadTree" || d.kind === "rocks" || d.kind === "debris") o.rotation.y += v * Math.PI * 2;
  return shadowed(o);
}

// --- Tu Tumba (meta) -------------------------------------------------------------------
/** La tumba de destino: lápida grande y vieja con cruz de hierro, velas y un brillo verdoso del más allá. */
function goalTomb(at = isoPos(BOARD.length)) {
  const { gx, gy } = at;
  const g = new THREE.Group();
  g.add(shadowed(mesh(new RoundedBoxGeometry(1.25, 0.4, 1.25, 4, 0.1), mat("#5c5a62", { roughness: 0.9, flatShading: true }), 0, 0.12, 0)));
  const tomb = new THREE.Group();
  const slab = new THREE.Shape();
  slab.moveTo(-0.38, 0);
  slab.lineTo(0.38, 0);
  slab.lineTo(0.38, 0.7);
  slab.absarc(0, 0.7, 0.38, 0, Math.PI, false);
  slab.lineTo(-0.38, 0);
  const geo = new THREE.ExtrudeGeometry(slab, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 });
  geo.translate(0, 0, -0.08);
  tomb.add(mesh(geo, mat("#8d8a92", { roughness: 0.95, flatShading: true })));
  // cruz de hierro oxidado y una calavera grabada
  const iron = mat("#3a2f2a", { metalness: 0.5, roughness: 0.6 });
  tomb.add(mesh(new THREE.BoxGeometry(0.07, 0.34, 0.03), iron, 0, 0.82, 0.1));
  tomb.add(mesh(new THREE.BoxGeometry(0.24, 0.07, 0.03), iron, 0, 0.88, 0.1));
  tomb.add(sphere(0.1, mat("#cfc8b8", { roughness: 0.8 }), 0, 0.42, 0.1, 10));
  [-1, 1].forEach((s) => tomb.add(sphere(0.028, glow(C.toxic, 2), s * 0.035, 0.44, 0.18, 8)));
  tomb.position.y = 0.32;
  tomb.rotation.y = Math.PI / 4;
  g.add(shadowed(tomb));
  // velas alrededor
  [[0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [0.5, 0.05], [0.05, 0.5]].forEach(([x, z], k) => {
    const h = 0.14 + (k % 3) * 0.05;
    g.add(cyl(0.035, 0.035, h, mat("#d9d0bd"), x, 0.32, z, 12));
    g.add(mesh(new THREE.ConeGeometry(0.022, 0.07, 10), glow("#ffb347", 3), x, 0.32 + h + 0.035, z));
  });
  // brillo verdoso del más allá sobre la tumba
  const ghost = new THREE.PointLight(C.toxic, 5, 3.5, 1.4);
  ghost.position.set(0.3, 1.3, 0.3);
  g.add(ghost);
  g.position.set(gx, 0, gy);
  return g;
}

// --- Escena y render ------------------------------------------------------------------
function lights(scene: THREE.Scene, target: THREE.Vector3, shadowSize: number) {
  // noche de terror: cielo azul frío, luna pálida; el calor solo viene del fuego y las velas
  scene.add(new THREE.HemisphereLight("#7d93b8", "#1a1814", 1.0));
  scene.add(new THREE.AmbientLight("#b8c4d8", 0.15));
  const sun = new THREE.DirectionalLight("#cfe0ff", 1.9);
  sun.position.set(target.x - 7, 12, target.z - 5);
  sun.target.position.copy(target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -13;
  sun.shadow.camera.right = sun.shadow.camera.top = 13;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
}

function renderer(width: number, height: number) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(width, height, false);
  r.setPixelRatio(1);
  r.setClearColor(0x000000, 0);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 1.3;
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

/** Cámara ortográfica con la misma proyección que IsoBoard; el rectángulo va en píxeles SVG. */
function isoCamera(x: number, y: number, w: number, h: number, target = new THREE.Vector3()) {
  const cam = new THREE.OrthographicCamera(x / K, (x + w) / K, -y / K, -(y + h) / K, 0.1, 200);
  const el = Math.PI / 6;
  cam.position.set(target.x + (Math.cos(el) / Math.SQRT2) * 50, target.y + Math.sin(el) * 50, target.z + (Math.cos(el) / Math.SQRT2) * 50);
  cam.lookAt(target);
  return cam;
}

/** Tablero completo: devuelve un PNG (data URL) del rectángulo VIEW a `scale` píxeles por píxel SVG. */
/** Reja de hierro a lo largo del borde de la isla, de (x0,z0) a (x1,z1), con columnas cada tanto. */
function ironFence(x0: number, z0: number, x1: number, z1: number) {
  const g = new THREE.Group();
  const len = Math.hypot(x1 - x0, z1 - z0);
  const piece = kenney("iron-fence", 0.32);
  const w = new THREE.Box3().setFromObject(piece).getSize(new THREE.Vector3()).x;
  const n = Math.floor(len / w);
  const yaw = -Math.atan2(z1 - z0, x1 - x0);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    // reja vieja: columnas cada cuatro tramos y algún tramo roto
    const p = i % 4 === 0 ? kenney("iron-fence-border-column", 0.4) : i % 5 === 2 ? kenney("iron-fence-damaged", 0.32) : piece.clone(true);
    p.position.set(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t);
    p.rotation.y = yaw;
    g.add(p);
  }
  return g;
}

export async function renderBoard(scale: number) {
  await loadModels();
  const scene = new THREE.Scene();
  scene.add(island(), tiles(), goalTomb());
  for (const d of DECOR) scene.add(decoration(d));
  // niebla: lo del fondo se pierde en la oscuridad
  scene.fog = new THREE.Fog("#141a22", 44, 66);
  // reja de hierro al borde de la isla: fondo y lados (delante no: taparía las casillas; a la izquierda
  // deja la entrada junto a la salida)
  const { y0: J0 } = ISLAND;
  scene.add(shadowed(ironFence(I0 + 0.6, J0 + 0.25, IX - 0.6, J0 + 0.25)));
  scene.add(shadowed(ironFence(I0 + 0.25, J0 + 0.6, I0 + 0.25, IY - 2.4)));
  scene.add(shadowed(ironFence(IX - 0.25, J0 + 0.6, IX - 0.25, IY - 0.6)));
  // luz de fuego: braseros fuertes, velas suaves
  for (const d of DECOR.filter((x) => x.kind === "fire" || x.kind === "candles" || x.kind === "lantern")) {
    const l = d.kind === "fire" ? new THREE.PointLight("#ff7a2a", 7, 4.5, 1.5) : new THREE.PointLight("#ffa040", 1.8, 2.2, 1.6);
    l.position.set(d.gx, d.kind === "fire" ? 0.9 : 0.5, d.gy);
    scene.add(l);
  }
  lights(scene, new THREE.Vector3(6.5, 0, 4.5), 8192);
  const w = Math.round(VIEW.w * scale);
  const h = Math.round(VIEW.h * scale);
  const r = renderer(w, h);
  r.render(scene, isoCamera(VIEW.x, VIEW.y, VIEW.w, VIEW.h));
  return r.domElement.toDataURL("image/png");
}

// --- Fichas: zombis con accesorios ---------------------------------------------------------
// Base única: el zombi del kit de Kenney (piezas rígidas: piernas, torso, brazos, cabeza), así todos
// tienen la misma silueta. Cada jugador se distingue por la camisa de su color y un accesorio en la
// cabeza; todos con los brazos hacia delante (pose de zombi) y una botella en la mano.

type Look =
  | "casco" | "gorra" | "novia" | "obra" | "vaquero" | "gas" | "cono" | "chistera"
  | "pirata" | "mago" | "corona" | "mohicano" | "cuernos" | "gorro" | "cerebro" | "bombero";
// un accesorio por color de PLAYER_COLORS (16 jugadores)
const LOOKS: Look[] = [
  "casco", "gorra", "novia", "obra", "vaquero", "gas", "cono", "chistera",
  "pirata", "mago", "corona", "mohicano", "cuernos", "gorro", "cerebro", "bombero",
];

/** Accesorio de cabeza, en coordenadas de la cabeza: `top` es la coronilla, `w` el ancho y `front` la cara. */
function headgear(look: Look, w: number, top: number, front: number) {
  const g = new THREE.Group();
  const m = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => mat(c, { flatShading: true, roughness: 0.7, ...o });
  const dome = (r: number, color: string, sy = 0.75) => {
    const d = mesh(new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), m(color), 0, top - w * 0.12, 0);
    d.scale.y = sy;
    return d;
  };
  switch (look) {
    case "casco": // casco militar con correa
      g.add(dome(w * 0.66, "#4b5a3a"), mesh(new THREE.CylinderGeometry(w * 0.72, w * 0.72, w * 0.05, 14), m("#3d4a2f"), 0, top - w * 0.1, 0));
      break;
    case "gorra": {
      g.add(dome(w * 0.6, "#2a3f73", 0.6));
      const visor = mesh(new THREE.BoxGeometry(w * 0.7, w * 0.05, w * 0.45), m("#22335e"), 0, top - w * 0.08, front + w * 0.12);
      g.add(visor);
      break;
    }
    case "novia": {
      // velo roto y una corona de flores marchitas
      const veil = mesh(new THREE.ConeGeometry(w * 0.75, w * 1.4, 10, 1, true), m("#e8e2d4", { transparent: true, opacity: 0.6, side: THREE.DoubleSide }), 0, top - w * 0.55, -w * 0.12);
      g.add(veil);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        g.add(mesh(new THREE.IcosahedronGeometry(w * 0.09, 0), m(k % 2 ? "#d8c7c0" : "#8a2a3a"), Math.cos(a) * w * 0.38, top - w * 0.04, Math.sin(a) * w * 0.38));
      }
      break;
    }
    case "obra": // casco de obra amarillo
      g.add(dome(w * 0.62, "#e0b020"), mesh(new THREE.CylinderGeometry(w * 0.7, w * 0.7, w * 0.04, 14), m("#c99a12"), 0, top - w * 0.1, w * 0.06));
      break;
    case "vaquero":
      g.add(mesh(new THREE.CylinderGeometry(w * 0.95, w * 0.95, w * 0.05, 14), m("#5a3a24"), 0, top + w * 0.02, 0));
      g.add(mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.48, w * 0.45, 10), m("#6b4630"), 0, top + w * 0.25, 0));
      break;
    case "gas": {
      // máscara de gas sobre la cara y gafas redondas
      const face = mesh(new THREE.BoxGeometry(w * 0.85, w * 0.55, w * 0.12), m("#2b2b2b"), 0, top - w * 0.6, front + w * 0.03);
      const filter = mesh(new THREE.CylinderGeometry(w * 0.16, w * 0.2, w * 0.3, 10), m("#4a4a48"), 0, top - w * 0.78, front + w * 0.2);
      filter.rotation.x = Math.PI / 2;
      g.add(face, filter);
      for (const sx of [-1, 1]) {
        const lens = mesh(new THREE.CylinderGeometry(w * 0.14, w * 0.14, w * 0.06, 12), glow(C.toxic, 0.8), sx * w * 0.2, top - w * 0.42, front + w * 0.08);
        lens.rotation.x = Math.PI / 2;
        g.add(lens);
      }
      break;
    }
    case "cono": // cono de tráfico en la cabeza
      g.add(mesh(new THREE.ConeGeometry(w * 0.45, w * 1.1, 10), m("#e8641e"), 0, top + w * 0.5, 0));
      g.add(mesh(new THREE.CylinderGeometry(w * 0.27, w * 0.32, w * 0.15, 10), m("#e8e2d4"), 0, top + w * 0.45, 0));
      break;
    case "pirata": // tricornio negro con filo dorado y una calavera
      g.add(dome(w * 0.62, "#1a1a1f", 0.5), mesh(new THREE.CylinderGeometry(w * 0.95, w * 0.95, w * 0.05, 3), m("#232329"), 0, top - w * 0.04, 0));
      g.add(mesh(new THREE.SphereGeometry(w * 0.1, 8, 6), m("#e8e2d4"), 0, top + w * 0.06, front * 0.9));
      break;
    case "mago": // sombrero puntiagudo morado con una estrella
      g.add(mesh(new THREE.CylinderGeometry(w * 0.85, w * 0.85, w * 0.05, 14), m("#3a1d6b"), 0, top + w * 0.02, 0));
      g.add(mesh(new THREE.ConeGeometry(w * 0.5, w * 1.5, 10), m("#4a2688"), 0, top + w * 0.78, 0));
      g.add(mesh(new THREE.OctahedronGeometry(w * 0.12), glow("#ffd23f", 0.6), 0, top + w * 0.5, front * 0.55));
      break;
    case "corona": // corona dorada de picos
      g.add(mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.5, w * 0.2, 12), m("#d9a520", { metalness: 0.2 }), 0, top + w * 0.05, 0));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        g.add(mesh(new THREE.ConeGeometry(w * 0.1, w * 0.28, 5), m("#f0c038"), Math.cos(a) * w * 0.43, top + w * 0.28, Math.sin(a) * w * 0.43));
      }
      break;
    case "mohicano": // cresta de pinchos de colores
      for (let k = 0; k < 5; k++) g.add(mesh(new THREE.ConeGeometry(w * 0.1, w * (0.5 - Math.abs(k - 2) * 0.08), 5), m(["#e53fd6", "#ff8a1f", "#ffd23f", "#8dff6a", "#2f7bf5"][k]), 0, top + w * 0.18, (k - 2) * w * 0.2));
      break;
    case "cuernos": // cuernos de diablo rojos
      for (const sx of [-1, 1]) {
        const horn = mesh(new THREE.ConeGeometry(w * 0.13, w * 0.5, 8), m("#b01020"), sx * w * 0.32, top + w * 0.12, 0);
        horn.rotation.z = -sx * 0.45;
        g.add(horn);
      }
      break;
    case "gorro": // gorro de lana con pompón
      g.add(dome(w * 0.58, "#c0392b", 0.8), mesh(new THREE.CylinderGeometry(w * 0.6, w * 0.6, w * 0.14, 12), m("#e8e2d4"), 0, top - w * 0.12, 0));
      g.add(mesh(new THREE.SphereGeometry(w * 0.15, 8, 6), m("#e8e2d4"), 0, top + w * 0.36, 0));
      break;
    case "cerebro": // cerebro al aire (es un zombi)
      for (const sx of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(w * 0.34, 8, 6), m("#e58aa0"), sx * w * 0.2, top + w * 0.08, 0));
      g.add(mesh(new THREE.SphereGeometry(w * 0.26, 8, 6), m("#d97088"), 0, top + w * 0.26, 0));
      break;
    case "bombero": // casco rojo de bombero con visera trasera
      g.add(dome(w * 0.64, "#c0261f"), mesh(new THREE.CylinderGeometry(w * 0.7, w * 0.7, w * 0.04, 14), m("#a01c16"), 0, top - w * 0.1, 0));
      g.add(mesh(new THREE.BoxGeometry(w * 0.3, w * 0.22, w * 0.05), m("#f0c038"), 0, top + w * 0.08, front * 0.6));
      break;
    case "chistera":
      g.add(mesh(new THREE.CylinderGeometry(w * 0.7, w * 0.7, w * 0.05, 14), m("#151515"), 0, top + w * 0.02, 0));
      g.add(mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.42, w * 0.75, 12), m("#1c1c1c"), 0, top + w * 0.4, 0));
      g.add(mesh(new THREE.CylinderGeometry(w * 0.43, w * 0.43, w * 0.12, 12), m("#7a1022"), 0, top + w * 0.12, 0));
      break;
  }
  return g;
}

function alien(color: string, look: Look) {
  const o = models.get("character-zombie")!.clone(true);
  // tamaño de ficha: el cuerpo (sin accesorios) mide 0,85 casillas
  const body = new THREE.Box3().setFromObject(o);
  o.scale.setScalar(0.85 / (body.max.y - body.min.y));
  // camisa del color del jugador (los zombis comparten todo lo demás)
  const torso = o.getObjectByName("torso") as THREE.Mesh;
  torso.material = mat(color, { roughness: 0.75, flatShading: true });
  // el modelo viene en cruz (brazos a los lados): se giran hacia delante, como buen zombi
  o.getObjectByName("arm-left")!.rotation.y = -Math.PI / 2 + 0.15;
  o.getObjectByName("arm-right")!.rotation.y = Math.PI / 2 - 0.15;
  // botella en la mano derecha (la punta del brazo es su x mínima)
  const arm = o.getObjectByName("arm-right") as THREE.Mesh;
  arm.geometry.computeBoundingBox();
  const hand = arm.geometry.boundingBox!;
  const bottle = new THREE.Group();
  const glass = mat("#3f6a3a", { roughness: 0.2, transparent: true, opacity: 0.85 });
  bottle.add(cyl(0.035, 0.035, 0.1, glass, 0, -0.05, 0, 10), cyl(0.012, 0.02, 0.05, glass, 0, 0.05, 0, 8));
  bottle.position.set(hand.min.x + 0.02, (hand.min.y + hand.max.y) / 2 + 0.03, 0);
  arm.add(bottle);
  // accesorio en la cabeza
  const head = o.getObjectByName("head") as THREE.Mesh;
  head.geometry.computeBoundingBox();
  const hb = head.geometry.boundingBox!;
  head.add(headgear(look, hb.max.x - hb.min.x, hb.max.y, hb.max.z));
  // de cara a la cámara (que mira desde +x +z)
  const g = new THREE.Group();
  g.add(o);
  g.rotation.y = Math.PI / 4;
  return shadowed(g);
}

/** Un PNG por color de jugador, con la misma cámara que el tablero. */
export function renderAliens(px: number) {
  const out: string[] = [];
  for (const [i, color] of PLAYER_COLORS.entries()) {
    const scene = new THREE.Scene();
    scene.add(alien(color, LOOKS[i % LOOKS.length]));
    lights(scene, new THREE.Vector3(0, 0, 0), 1024);
    // luz de relleno de frente: las fichas tienen que leerse aunque el tablero sea oscuro
    const fill = new THREE.DirectionalLight("#fff0e0", 1.6);
    fill.position.set(5, 3, 5);
    scene.add(fill);
    // sombra suave en el suelo, que se ve en la ficha
    const ground = mesh(new THREE.CircleGeometry(0.45, 32), new THREE.ShadowMaterial({ opacity: 0.25 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const r = renderer(px, Math.round(px * 1.2));
    const half = 0.66 * K; // ancho de la vista en píxeles SVG
    r.render(scene, isoCamera(-half, -half * 1.7, half * 2, half * 2.4, new THREE.Vector3(0, 0, 0)));
    out.push(r.domElement.toDataURL("image/png"));
    r.dispose();
  }
  return out;
}

/** Ilustración de cada tipo de casilla para tarjetas y títulos: su losa en 3D (la meta, la nave). */
export function renderTileIcons(px: number) {
  const out: Record<string, string> = {};
  for (const type of Object.keys(TILE_STYLE) as Tile["type"][]) {
    const scene = new THREE.Scene();
    const meta = type === "META";
    scene.add(meta ? goalTomb({ gx: 0, gy: 0 }) : tile(type, 0, 0));
    lights(scene, new THREE.Vector3(0, 0, 0), 1024);
    const r = renderer(px, px);
    const half = (meta ? 1.75 : 0.72) * K;
    const cy = meta ? -1.1 * K : 0;
    r.render(scene, isoCamera(-half, cy - half, half * 2, half * 2));
    out[type.toLowerCase()] = r.domElement.toDataURL("image/png");
    r.dispose();
  }
  return out;
}

declare global {
  interface Window {
    __render?: () => Promise<{ board: string; aliens: string[]; icons: Record<string, string> }>;
  }
}
window.__render = async () => ({ board: await renderBoard(2.5), aliens: renderAliens(320), icons: renderTileIcons(256) });
