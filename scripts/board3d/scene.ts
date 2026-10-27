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
import { DECOR, type Deco } from "@/game/decor";
import { ISLAND, ISO_VIEW as VIEW, isoPos } from "@/game/isoPath";
import { PLAYER_COLORS, TILE_STYLE } from "@/game/tileStyle";

// --- Proyección (igual que IsoBoard) -------------------------------------------
const K = 50 * Math.SQRT2; // píxeles SVG por unidad de mundo en horizontal
const { x0: I0, x1: IX, y1: IY, thickness: ISLAND_T } = ISLAND;
const TILE_TOP = 10 / (K * Math.cos(Math.PI / 6)); // 10 px de canto, como TILE_T en IsoBoard

// --- Paleta y materiales ----------------------------------------------------------
const mat = (color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts });
const glow = (color: string, intensity = 1.6) => mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.4 });

// Paleta "Muertos de Sed": panteón de noche, morado y naranja cempasúchil, rosa mexicano.
const C = {
  grass: "#3f7a5a",
  grassLight: "#4a8763",
  dirt: "#6b4560",
  dirtDark: "#4a2c45",
  cream: "#f1e6d2", // hueso
  marigold: "#ff9500",
  white: "#fffaf0",
  gold: "#ffcf3f",
  calimocho: "#c2185b",
};

function lighten(hex: string, amount: number) {
  const c = new THREE.Color(hex);
  return amount >= 0 ? c.lerp(new THREE.Color("#ffffff"), amount) : c.lerp(new THREE.Color("#000000"), -amount);
}

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

const TILE_GEO = new RoundedBoxGeometry(0.95, 0.24, 0.95, 4, 0.08);
const GLYPH_PLANE = new THREE.PlaneGeometry(0.62, 0.62).rotateX(-Math.PI / 2);

/** Una losa con su símbolo pintado, centrada en (x, z). */
function tile(type: Tile["type"], x: number, z: number) {
  const g = new THREE.Group();
  const s = TILE_STYLE[type];
  const colored = !["RETO", "RASGO", "POSICION", "CULTURAL"].includes(type);
  const top = colored ? new THREE.Color(s.bg[0]).lerp(new THREE.Color(s.bg[1]), 0.25) : new THREE.Color(C.cream);
  // símbolo blanco sobre losas de color; sobre las claras (crema, duelo), del color de la casilla o azul tinta
  const light = top.r * 0.3 + top.g * 0.59 + top.b * 0.11 > 0.8;
  const ink = !colored ? s.bg[1] : light ? "#5468a8" : "#ffffff";
  // un poco de brillo propio para que las casillas se lean de noche, como neón suave
  g.add(shadowed(mesh(TILE_GEO, new THREE.MeshStandardMaterial({ color: top, roughness: 0.55, emissive: top, emissiveIntensity: 0.22 }), x, TILE_TOP - 0.12, z)));
  const decal = new THREE.MeshStandardMaterial({
    map: glyphTexture(type, ink, "#" + top.getHexString()),
    transparent: true,
    roughness: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
  const m = mesh(GLYPH_PLANE, decal, x, TILE_TOP + 0.002, z);
  m.receiveShadow = true;
  g.add(m);
  return g;
}

function tiles() {
  const g = new THREE.Group();
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
  "urn-round", "fire-basket", "rocks",
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

/** Ofrenda: altar de piedra con velas, cempasúchil, pan de muerto y una calaverita de azúcar. */
function ofrenda(v: number) {
  const g = kenney("altar-stone", 0.32, Math.PI / 2);
  const top = topOf(g);
  g.add(kenney("candle-multiple", 0.16).translateX(-0.12).translateY(top).translateZ(0.08));
  const bread = sphere(0.06, mat("#d9893b", { roughness: 0.7 }), 0.1, top + 0.03, 0.05, 14);
  bread.scale.y = 0.6;
  g.add(bread, sphere(0.05, mat("#fffaf0", { roughness: 0.4 }), 0.02, top + 0.05, -0.1, 14));
  [-1, 1].forEach((s) => g.add(sphere(0.012, mat("#ff4f8b"), 0.02 + s * 0.017, top + 0.06, -0.06, 8)));
  for (let k = 0; k < 5; k++) g.add(sphere(0.04, mat(k % 2 ? C.marigold : "#ff4f8b", { roughness: 0.9, flatShading: true }), -0.2 + k * 0.1, top + 0.02, -0.16 + v * 0.02, 6));
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

/** Mata de cempasúchil: hojas verdes con pompones naranjas. */
function marigold(v: number) {
  const g = new THREE.Group();
  // low poly, como los modelos de Kenney
  g.add(mesh(new THREE.IcosahedronGeometry(0.16, 0), mat("#2f6b3a", { flatShading: true }), 0, 0.1, 0));
  for (let k = 0; k < 7; k++) {
    const a = k * 0.9 + v * 5;
    const r = k === 0 ? 0 : 0.11;
    g.add(mesh(new THREE.IcosahedronGeometry(0.06, 0), mat(k % 3 ? C.marigold : "#ffb627", { roughness: 0.9, flatShading: true }), Math.cos(a) * r, 0.2 + (k % 2) * 0.03, Math.sin(a) * r));
  }
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

/** Guirnalda de papel picado entre dos puntos. */
function papelPicado(a: THREE.Vector3, b: THREE.Vector3, n = 12) {
  const g = new THREE.Group();
  const colors = ["#ff4f8b", "#ff9f1c", "#b07cff", "#3fd0c9", "#ffd23f", "#7ee36b"];
  const pts: THREE.Vector3[] = [];
  const dir = b.clone().sub(a);
  const yaw = Math.atan2(-dir.z, dir.x);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * 0.22;
    pts.push(p);
    if (i < n) {
      const flag = mesh(new THREE.PlaneGeometry(0.2, 0.17), new THREE.MeshStandardMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide, roughness: 0.7, emissive: colors[i % colors.length], emissiveIntensity: 0.25 }));
      const q = a.clone().lerp(b, t + 0.5 / n);
      q.y -= Math.sin((t + 0.5 / n) * Math.PI) * 0.22 + 0.09;
      flag.position.copy(q);
      flag.rotation.y = yaw;
      g.add(flag);
    }
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.005, 4), mat("#3b2c4a")));
  return g;
}

/** Altura de cada objeto en casillas (tabla de escala de la skill diseno-tablero). */
function decoration(d: Deco) {
  const v = vary(d.gx, d.gy);
  const builders: Record<Deco["kind"], () => THREE.Object3D> = {
    pine: () => kenney(v > 0.5 ? "pine" : "pine-crooked", 2.2 + v * 0.4),
    pineFall: () => kenney(v > 0.5 ? "pine-fall" : "pine-fall-crooked", 2.1 + v * 0.4),
    lantern: () => kenney("lightpost-single", 1.25),
    crypt: () => mausoleum(),
    tombstone: () => kenney((["gravestone-round", "gravestone-cross", "gravestone-decorative", "gravestone-bevel"] as const)[Math.floor(v * 4)], 0.5),
    cross: () => kenney("cross-wood", 0.5),
    candles: () => kenney("candle-multiple", 0.36),
    marigold: () => marigold(v),
    ofrenda: () => ofrenda(v),
    grave: () => grave(),
    sign: () => sign(),
  };
  const o = builders[d.kind]();
  o.position.set(d.gx, 0, d.gy);
  o.rotation.y += d.turn ?? 0;
  // solo la vegetación lleva una variación mínima de giro (regla: alineado a la cuadrícula)
  if (d.kind === "pine" || d.kind === "pineFall" || d.kind === "marigold") o.rotation.y += (v - 0.5) * 0.35;
  if (d.kind === "crypt") o.scale.multiplyScalar(2);
  if (d.kind === "marigold") o.scale.multiplyScalar(1.6);
  if (d.kind === "ofrenda") o.scale.multiplyScalar(1.5);
  if (d.kind === "sign") o.scale.multiplyScalar(1.3);
  return shadowed(o);
}

// --- Tu Tumba (meta) -------------------------------------------------------------------
/** La tumba de destino: lápida grande con arco de cempasúchil, velas y el resplandor del amanecer. */
function goalTomb(at = isoPos(BOARD.length)) {
  const { gx, gy } = at;
  const g = new THREE.Group();
  g.add(shadowed(mesh(new RoundedBoxGeometry(1.25, 0.4, 1.25, 4, 0.1), mat("#b9b3cc", { roughness: 0.6 }), 0, 0.12, 0)));
  const tomb = new THREE.Group();
  const slab = new THREE.Shape();
  slab.moveTo(-0.38, 0);
  slab.lineTo(0.38, 0);
  slab.lineTo(0.38, 0.7);
  slab.absarc(0, 0.7, 0.38, 0, Math.PI, false);
  slab.lineTo(-0.38, 0);
  const geo = new THREE.ExtrudeGeometry(slab, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 });
  geo.translate(0, 0, -0.08);
  tomb.add(mesh(geo, mat("#e9e3f5", { roughness: 0.5 })));
  // cruz dorada y calavera grabada
  tomb.add(mesh(new THREE.BoxGeometry(0.07, 0.34, 0.03), mat(C.gold, { metalness: 0.6, roughness: 0.3 }), 0, 0.82, 0.1));
  tomb.add(mesh(new THREE.BoxGeometry(0.24, 0.07, 0.03), mat(C.gold, { metalness: 0.6, roughness: 0.3 }), 0, 0.88, 0.1));
  tomb.add(sphere(0.1, mat("#fffaf0", { roughness: 0.4 }), 0, 0.42, 0.1, 18));
  [-1, 1].forEach((s) => tomb.add(sphere(0.028, mat("#1e1028"), s * 0.035, 0.44, 0.18, 10)));
  // arco de cempasúchil
  for (let k = 0; k <= 16; k++) {
    const a = (k / 16) * Math.PI;
    tomb.add(sphere(0.07, mat(k % 3 ? C.marigold : "#ff4f8b", { roughness: 0.9 }), Math.cos(a) * 0.55, 0.15 + Math.sin(a) * 0.95, 0.12, 12));
  }
  tomb.position.y = 0.32;
  tomb.rotation.y = Math.PI / 4;
  g.add(shadowed(tomb));
  // velas alrededor
  [[0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [0.5, 0.05], [0.05, 0.5]].forEach(([x, z], k) => {
    const h = 0.14 + (k % 3) * 0.05;
    g.add(cyl(0.035, 0.035, h, mat("#fff4e0"), x, 0.32, z, 12));
    g.add(mesh(new THREE.ConeGeometry(0.022, 0.07, 10), glow("#ffb347", 3), x, 0.32 + h + 0.035, z));
  });
  // luz cálida del amanecer que asoma detrás de la tumba
  const dawn = new THREE.PointLight("#ffb347", 6, 4, 1.4);
  dawn.position.set(-0.4, 1.4, -0.4);
  g.add(dawn);
  g.position.set(gx, 0, gy);
  return g;
}

// --- Escena y render ------------------------------------------------------------------
function lights(scene: THREE.Scene, target: THREE.Vector3, shadowSize: number) {
  // noche de Día de Muertos: cielo morado, luz de luna lila y algo de calor de las velas
  scene.add(new THREE.HemisphereLight("#9b7bff", "#3a2050", 1.25));
  scene.add(new THREE.AmbientLight("#ffd9b0", 0.3));
  const sun = new THREE.DirectionalLight("#d8ccff", 2.0);
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
    const p = i % 4 === 0 ? kenney("iron-fence-border-column", 0.4) : piece.clone(true);
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
  // papel picado colgado entre los árboles de la primera fila del fondo
  scene.add(papelPicado(new THREE.Vector3(1.2, 1.4, -1.2), new THREE.Vector3(6, 1.4, -1.2), 14));
  scene.add(papelPicado(new THREE.Vector3(8.4, 1.4, -1.2), new THREE.Vector3(13.2, 1.4, -1.2), 14));
  // reja de hierro al borde de la isla: fondo y lados (delante no: taparía las casillas; a la izquierda
  // deja la entrada junto a la salida)
  const { y0: J0 } = ISLAND;
  scene.add(shadowed(ironFence(I0 + 0.6, J0 + 0.25, IX - 0.6, J0 + 0.25)));
  scene.add(shadowed(ironFence(I0 + 0.25, J0 + 0.6, I0 + 0.25, IY - 2.4)));
  scene.add(shadowed(ironFence(IX - 0.25, J0 + 0.6, IX - 0.25, IY - 0.6)));
  // luz cálida de velas, ofrenda y faroles
  for (const d of DECOR.filter((x) => x.kind === "candles" || x.kind === "ofrenda" || x.kind === "lantern")) {
    const l = new THREE.PointLight("#ffa040", 2.2, 2.6, 1.6);
    l.position.set(d.gx, 0.5, d.gy);
    scene.add(l);
  }
  lights(scene, new THREE.Vector3(6.5, 0, 4.5), 8192);
  const w = Math.round(VIEW.w * scale);
  const h = Math.round(VIEW.h * scale);
  const r = renderer(w, h);
  r.render(scene, isoCamera(VIEW.x, VIEW.y, VIEW.w, VIEW.h));
  return r.domElement.toDataURL("image/png");
}

// --- Calaveritas (fichas) ---------------------------------------------------------------
// Todas comparten la misma silueta (cuerpo de gominola: ancho abajo, redondo arriba, patitas
// y bracitos cortos), la cara de calaverita de azúcar y su jarrito de mezcal; cada una se
// distingue por su disfraz, como una colección de muñecos. Se construyen mirando a +z y luego
// se giran hacia la cámara.

/** Perfil del cuerpo (radio, altura) para el torno. */
const BODY_PROFILE = new THREE.SplineCurve(
  [[0, 0], [0.28, 0], [0.34, 0.06], [0.36, 0.24], [0.35, 0.5], [0.3, 0.7], [0.19, 0.85], [0, 0.89]].map(([x, y]) => new THREE.Vector2(x, y)),
).getPoints(48);
// alturas de la cara y de la coronilla (los accesorios se colocan respecto a ellas)
const EYE_Y = 0.57;
const MOUTH_Y = 0.44;
const TOP = 0.89;

/** Radio del cuerpo a la altura y (para pegar ojos, boca y accesorios a la superficie). */
function bodyR(y: number) {
  for (let i = 1; i < BODY_PROFILE.length; i++) {
    const a = BODY_PROFILE[i - 1];
    const b = BODY_PROFILE[i];
    if ((a.y <= y && y <= b.y) || (b.y <= y && y <= a.y)) {
      const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
      return a.x + (b.x - a.x) * t;
    }
  }
  return 0;
}

/** Punto de la superficie delantera a la altura y, desplazado `side` hacia un lado. */
function onFront(y: number, side = 0, out = 0) {
  const r = bodyR(y);
  const z = Math.sqrt(Math.max(r * r - side * side, 0));
  return new THREE.Vector3(side, y, z + out);
}

/** Pega un objeto a la superficie delantera, orientado hacia fuera. */
function stick(o: THREE.Object3D, y: number, side = 0, out = 0) {
  const p = onFront(y, side, out);
  o.position.copy(p);
  o.lookAt(p.clone().add(new THREE.Vector3(side * 1.4, 0, p.z).normalize()));
  return o;
}

type Look = "mariachi" | "luchador" | "catrina" | "novia" | "diablito" | "chaman" | "cura" | "rockero";
const LOOKS: Look[] = ["mariachi", "luchador", "catrina", "novia", "diablito", "chaman", "cura", "rockero"];
const INK = "#1e1028";

/** Cuenca del ojo de la calavera: hueco oscuro con un brillo de color (los muertos tienen alma). */
function socket(iris: string, size = 0.072) {
  const g = new THREE.Group();
  const hole = sphere(size, mat(INK, { roughness: 0.3 }), 0, 0, 0, 24);
  hole.scale.set(1, 1.1, 0.4);
  const glowEye = sphere(size * 0.38, glow(iris, 1.4), size * 0.1, 0, size * 0.3, 14);
  glowEye.scale.z = 0.5;
  const shine = sphere(size * 0.14, mat("#ffffff"), size * 0.25, size * 0.25, size * 0.4, 8);
  g.add(hole, glowEye, shine);
  return g;
}

/** Cara de calaverita de azúcar pintada sobre el cuerpo: máscara de hueso, cuencas, nariz y sonrisa cosida. */
function sugarSkull(g: THREE.Group, accent: string, opts: { eyes?: boolean; mask?: boolean } = {}) {
  const bone = mat("#fbf3e6", { roughness: 0.45, emissive: "#fbf3e6", emissiveIntensity: 0.12 });
  // con máscara de hueso, los rasgos van por delante de ella (sobresale unos 4 cm del cuerpo)
  const lift = opts.mask === false ? 0 : 1;
  if (opts.mask !== false) {
    const face = sphere(0.24, bone, 0, 0, 0, 32);
    face.scale.set(1, 1.05, 0.32);
    g.add(stick(face, EYE_Y - 0.06, 0, -0.035));
  }
  if (opts.eyes !== false) for (const s of [-1, 1]) g.add(stick(socket(accent), EYE_Y, s * 0.095, 0.03 * lift));
  // nariz de corazón al revés
  for (const s of [-1, 1]) {
    const n = sphere(0.018, mat(INK), 0, 0, 0, 10);
    n.scale.z = 0.4;
    g.add(stick(n, MOUTH_Y + 0.055, s * 0.012, 0.004 + 0.04 * lift));
  }
  // sonrisa cosida
  const mouth = new THREE.Group();
  const line = mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 24, Math.PI * 0.7), mat(INK));
  line.rotation.z = Math.PI + Math.PI * 0.15;
  mouth.add(line);
  for (let k = -3; k <= 3; k++) {
    const a = -Math.PI / 2 + k * 0.17;
    const st = mesh(new THREE.BoxGeometry(0.006, 0.035, 0.006), mat(INK), Math.cos(a) * 0.08, Math.sin(a) * 0.08 + 0.002, 0);
    st.rotation.z = a + Math.PI / 2;
    mouth.add(st);
  }
  g.add(stick(mouth, MOUTH_Y + 0.07, 0, 0.004 + 0.035 * lift));
  // adornos de colores: puntitos en las mejillas y una flor en la frente
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const d = sphere(0.011, mat(accent), 0, 0, 0, 8);
      d.scale.z = 0.4;
      g.add(stick(d, MOUTH_Y + 0.02 + k * 0.022, s * (0.155 + (k % 2) * 0.012), 0.003 + 0.02 * lift));
    }
  }
  const flower = new THREE.Group();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const pt = sphere(0.018, mat(accent), Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0, 8);
    pt.scale.z = 0.35;
    flower.add(pt);
  }
  flower.add(sphere(0.012, mat(C.gold), 0, 0, 0.004, 8));
  g.add(stick(flower, EYE_Y + 0.12, 0, 0.002 + 0.025 * lift));
}

/** Calaverita fiestera: misma silueta para todos, cara de calavera de azúcar, jarrito de barro y un disfraz. */
function alien(color: string, look: Look) {
  const g = new THREE.Group();
  const skin = mat(color, { roughness: 0.5 });
  const dark = mat("#" + lighten(color, -0.35).getHexString(), { roughness: 0.6 });

  // cuerpo (con el traje del color del jugador), patitas de hueso y bracitos
  g.add(mesh(new THREE.LatheGeometry(BODY_PROFILE, 64), skin));
  for (const s of [-1, 1]) {
    const foot = sphere(0.085, mat("#fbf3e6", { roughness: 0.5 }), s * 0.15, 0.03, 0.12, 20);
    foot.scale.set(1, 0.55, 1.25);
    g.add(foot);
  }
  for (const s of [-1, 1]) {
    const arm = sphere(0.075, skin, s * 0.36, 0.3, 0.06, 20);
    arm.scale.set(0.8, 1.25, 0.8);
    arm.rotation.z = s * 0.5;
    g.add(arm);
  }
  // jarrito de barro con mezcal, en la mano izquierda
  const clay = mat("#c8663b", { roughness: 0.75 });
  g.add(mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.13, 20), clay, -0.38, 0.27, 0.18));
  const handle = mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 16), clay, -0.45, 0.28, 0.18);
  handle.rotation.y = Math.PI / 2;
  g.add(handle);
  const drink = mesh(new THREE.CircleGeometry(0.058, 20), glow("#ffe9a8", 0.3), -0.38, 0.336, 0.18);
  drink.rotation.x = -Math.PI / 2;
  g.add(drink);

  switch (look) {
    case "mariachi": {
      sugarSkull(g, "#ff4f8b");
      const black = mat("#1e1028", { roughness: 0.6 });
      const brim = mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.03, 48), black, 0, TOP - 0.1, 0);
      const crown = mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.24, 32), black, 0, TOP - 0.08, 0);
      const trim = mesh(new THREE.TorusGeometry(0.5, 0.015, 8, 48), mat(C.gold, { metalness: 0.7, roughness: 0.3 }), 0, TOP - 0.085, 0);
      trim.rotation.x = Math.PI / 2;
      const band = mesh(new THREE.TorusGeometry(0.21, 0.018, 8, 32), mat(C.gold, { metalness: 0.7, roughness: 0.3 }), 0, TOP - 0.03, 0);
      band.rotation.x = Math.PI / 2;
      g.add(brim, crown, trim, band);
      // moño de charro
      const bow = new THREE.Group();
      for (const s of [-1, 1]) {
        const w = mesh(new THREE.ConeGeometry(0.05, 0.09, 4), mat("#c2185b"), s * 0.045, 0, 0);
        w.rotation.z = (s * Math.PI) / 2;
        bow.add(w);
      }
      g.add(stick(bow, 0.24, 0, 0.01));
      break;
    }
    case "luchador": {
      // máscara de luchador en vez de la cara de hueso: de color, con ribetes y cuencas
      sugarSkull(g, "#ffd23f", { mask: false });
      const trimMat = mat("#ffd23f", { roughness: 0.4 });
      for (const s of [-1, 1]) {
        const ring = mesh(new THREE.TorusGeometry(0.085, 0.014, 8, 24), trimMat);
        g.add(stick(ring, EYE_Y, s * 0.095, 0.004));
      }
      const crest = mesh(new THREE.BoxGeometry(0.04, 0.3, 0.05), trimMat, 0, TOP - 0.06, 0.12);
      crest.rotation.x = -0.6;
      g.add(crest);
      // capa
      const cape = mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.55, 32, 1, true, Math.PI * 0.75, Math.PI * 1.5), mat("#ffd23f", { side: THREE.DoubleSide, roughness: 0.6 }), 0, 0.35, -0.03);
      g.add(cape);
      break;
    }
    case "catrina": {
      sugarSkull(g, "#ff4f8b");
      const hat = mat("#2b1840", { roughness: 0.6 });
      const brim = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.025, 48), hat, 0, TOP - 0.08, 0);
      brim.rotation.x = -0.15;
      const crown = mesh(new THREE.SphereGeometry(0.22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), hat, 0, TOP - 0.08, -0.02);
      g.add(brim, crown);
      // flores y pluma
      [[0.18, 0.05, "#ff4f8b"], [0.05, 0.2, C.marigold], [-0.12, 0.17, "#b07cff"], [0.22, -0.1, "#ffd23f"]].forEach(([x, z, c]) =>
        g.add(sphere(0.06, mat(c as string, { roughness: 0.8 }), x as number, TOP - 0.02, z as number, 14)),
      );
      const feather = sphere(0.05, mat("#fbf3e6"), -0.15, TOP + 0.12, -0.05, 14);
      feather.scale.set(0.6, 2.6, 0.6);
      feather.rotation.z = 0.5;
      g.add(feather);
      break;
    }
    case "novia": {
      sugarSkull(g, "#b07cff");
      // velo y corona de flores
      const veil = mesh(new THREE.SphereGeometry(0.42, 32, 20, Math.PI * 0.85, Math.PI * 1.3, 0, Math.PI * 0.62), mat("#ffffff", { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6 }), 0, 0.5, -0.02);
      veil.scale.y = 1.15;
      g.add(veil);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        g.add(sphere(0.045, mat(k % 2 ? "#ffffff" : "#ff8fb0", { roughness: 0.8 }), Math.cos(a) * 0.19, TOP - 0.06, Math.sin(a) * 0.19, 12));
      }
      break;
    }
    case "diablito": {
      sugarSkull(g, "#ffd23f");
      for (const s of [-1, 1]) {
        const horn = mesh(new THREE.ConeGeometry(0.05, 0.18, 16), mat("#2b1018", { roughness: 0.4 }), s * 0.15, TOP - 0.02, 0);
        horn.rotation.z = -s * 0.45;
        g.add(horn);
      }
      // colita con punta de flecha
      const tail = mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 24, Math.PI * 1.2), dark, -0.05, 0.22, -0.4);
      tail.rotation.y = Math.PI / 2;
      g.add(tail, mesh(new THREE.ConeGeometry(0.05, 0.08, 3), dark, -0.05, 0.38, -0.5));
      break;
    }
    case "chaman": {
      sugarSkull(g, "#3fd0c9");
      // penacho de plumas
      const colors = ["#ff4f8b", C.marigold, "#ffd23f", "#3fd0c9", "#b07cff"];
      for (let k = -4; k <= 4; k++) {
        const f = sphere(0.045, mat(colors[(k + 4) % colors.length], { roughness: 0.7 }), Math.sin(k * 0.3) * 0.22, TOP + 0.1, -0.04 - Math.cos(k * 0.3) * 0.04, 12);
        f.scale.set(0.6, 2.8, 0.4);
        f.rotation.z = -k * 0.28;
        g.add(f);
      }
      const band = mesh(new THREE.TorusGeometry(0.27, 0.025, 8, 36), mat("#7a4a2c"), 0, TOP - 0.17, 0);
      band.rotation.x = Math.PI / 2;
      g.add(band);
      break;
    }
    case "cura": {
      sugarSkull(g, "#ffd23f");
      // alzacuellos blanco y cruz dorada
      g.add(stick(mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), mat("#ffffff")), 0.3, 0, 0.01));
      const cross = new THREE.Group();
      cross.add(mesh(new THREE.BoxGeometry(0.025, 0.1, 0.015), mat(C.gold, { metalness: 0.7, roughness: 0.3 })), mesh(new THREE.BoxGeometry(0.07, 0.025, 0.015), mat(C.gold, { metalness: 0.7, roughness: 0.3 }), 0, 0.02, 0));
      g.add(stick(cross, 0.17, 0, 0.012));
      // bonete negro
      const hat = mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 4), mat("#1e1028", { roughness: 0.6 }), 0, TOP - 0.02, 0);
      hat.rotation.y = Math.PI / 4;
      g.add(hat, sphere(0.035, mat("#c2185b"), 0, TOP + 0.06, 0, 10));
      break;
    }
    case "rockero": {
      sugarSkull(g, "#7ee36b", { eyes: false });
      // gafas de sol y cresta punk
      for (const s of [-1, 1]) g.add(stick(mesh(new RoundedBoxGeometry(0.15, 0.085, 0.03, 3, 0.03), mat(INK, { roughness: 0.15, metalness: 0.3 })), EYE_Y, s * 0.09, 0.045));
      for (let k = 0; k < 6; k++) {
        const spike = mesh(new THREE.ConeGeometry(0.045, 0.2, 8), mat("#7ee36b", { roughness: 0.5 }), 0, TOP - 0.02 - Math.abs(k - 2.5) * 0.03, 0.18 - k * 0.07);
        spike.rotation.x = -0.3 + k * 0.12;
        g.add(spike);
      }
      break;
    }
  }
  g.rotation.y = Math.PI / 4; // de frente a la cámara (que mira desde +x +z)
  const out = new THREE.Group();
  out.add(g);
  return shadowed(out);
}

/** Un PNG por color de jugador, con la misma cámara que el tablero. */
export function renderAliens(px: number) {
  const out: string[] = [];
  for (const [i, color] of PLAYER_COLORS.entries()) {
    const scene = new THREE.Scene();
    scene.add(alien(color, LOOKS[i % LOOKS.length]));
    lights(scene, new THREE.Vector3(0, 0, 0), 1024);
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
