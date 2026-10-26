// Escena 3D del tablero de Ebrionautas ("planeta después de la fiesta"). Se renderiza una vez
// (scripts/board3d/render.mjs) a una imagen que la TV usa de fondo: la TV no necesita WebGL.
//
// Cuadrícula → mundo: x = gx, z = gy, y hacia arriba; el césped está en y = 0.
// La cámara ortográfica reproduce la proyección 2:1 de IsoBoard (sx/sy), así que las fichas
// se colocan encima con las mismas cuentas.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
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

const C = {
  grass: "#a9dc5e",
  grassLight: "#b9e46c",
  dirt: "#c38551",
  dirtDark: "#9c6238",
  cream: "#f4e9d4",
  trunk: "#a8683f",
  pine: ["#3fc2b0", "#36b3a3", "#2ea496"],
  leaf: ["#8fd453", "#7cc847", "#9edd5f"],
  pink: ["#ff8fc8", "#f574b6", "#ffa8d6"],
  bush: "#5fb94a",
  red: "#ef4a5a",
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
  g.add(shadowed(mesh(TILE_GEO, new THREE.MeshStandardMaterial({ color: top, roughness: 0.55 }), x, TILE_TOP - 0.12, z)));
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
const cone = (r: number, h: number, color: string, x = 0, y = 0, z = 0) =>
  mesh(new THREE.ConeGeometry(r, h, 18), mat(color, { roughness: 0.6 }), x, y + h / 2, z);

/** Variación estable por posición (sin aleatorio: el render sale igual cada vez). */
const vary = (gx: number, gy: number, k = 1) => {
  const v = Math.sin(gx * 12.9898 + gy * 78.233 + k * 3.1) * 43758.5453;
  return v - Math.floor(v);
};

function pine(v: number) {
  const g = new THREE.Group();
  const s = 0.9 + v * 0.3;
  g.add(cyl(0.07, 0.09, 0.3, C.trunk));
  [0, 1, 2].forEach((i) => g.add(cone(0.46 - i * 0.1, 0.55, C.pine[i], 0, 0.22 + i * 0.32)));
  g.scale.setScalar(s);
  return g;
}

function roundTree(colors: string[], v: number, tall = false) {
  const g = new THREE.Group();
  const h = tall ? 0.75 : 0.5;
  g.add(cyl(0.07, 0.1, h, C.trunk));
  const blobs: [number, number, number, number][] = tall
    ? [[0, h + 0.15, 0, 0.3], [0.12, h + 0.45, 0.05, 0.26], [-0.1, h + 0.7, -0.04, 0.2], [-0.16, h + 0.2, 0.12, 0.22]]
    : [[0, h + 0.28, 0, 0.36], [0.24, h + 0.12, 0.1, 0.26], [-0.22, h + 0.14, -0.06, 0.27], [0.02, h + 0.08, 0.26, 0.24]];
  blobs.forEach(([x, y, z, r], i) => g.add(sphere(r, colors[i % colors.length], x, y, z)));
  g.scale.setScalar(0.95 + v * 0.25);
  return g;
}

function bush() {
  const g = new THREE.Group();
  g.add(sphere(0.17, C.bush, 0, 0.12, 0), sphere(0.13, "#6cc655", 0.17, 0.08, 0.05), sphere(0.12, "#56ad43", -0.15, 0.08, 0.07));
  return g;
}

function mushroom(x: number, z: number, s: number) {
  const g = new THREE.Group();
  g.add(cyl(0.045, 0.055, 0.16, C.white));
  const cap = mesh(new THREE.SphereGeometry(0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.red, { roughness: 0.45 }), 0, 0.15, 0);
  cap.scale.y = 0.8;
  g.add(cap);
  for (const [dx, dy, dz] of [[0.06, 0.24, 0.07], [-0.07, 0.22, 0.06], [0.01, 0.25, -0.08], [0.1, 0.19, -0.04]]) g.add(sphere(0.022, C.white, dx, dy, dz, 10));
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  return g;
}

function crystalRock() {
  const g = new THREE.Group();
  const rock = mesh(new THREE.DodecahedronGeometry(0.2, 0), mat("#9aa3b5", { flatShading: true, roughness: 0.85 }), 0, 0.1, 0);
  rock.scale.set(1.2, 0.7, 1);
  g.add(rock);
  [[0, 0.32, 0, 0.06, 0.28], [0.08, 0.26, 0.05, 0.045, 0.2], [-0.07, 0.25, 0.04, 0.04, 0.18]].forEach(([x, y, z, r, h]) => {
    const c = mesh(new THREE.ConeGeometry(r, h, 5), glow("#7fe6ff", 0.6), x, y, z);
    c.rotation.z = x * 3;
    g.add(c);
  });
  return g;
}

function logs() {
  const g = new THREE.Group();
  const wood = mat("#9b5d34");
  const end = mat("#e3b07a");
  [[-0.08, 0.07, 0], [0.08, 0.07, 0.02], [0, 0.19, 0.01]].forEach(([x, y, z]) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.42, 16), [wood, end, end]);
    l.rotation.z = Math.PI / 2;
    l.rotation.y = 0.5;
    l.position.set(x, y, z);
    g.add(l);
  });
  return g;
}

function flowers(v: number) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + v * 6;
    const x = Math.cos(a) * 0.17 * (i % 2 ? 1 : 0.5);
    const z = Math.sin(a) * 0.17 * (i % 2 ? 1 : 0.5);
    g.add(cyl(0.008, 0.008, 0.07, "#4f9a3a", x, 0, z, 6));
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const petal = sphere(0.025, C.white, x + Math.cos(pa) * 0.03, 0.075, z + Math.sin(pa) * 0.03, 8);
      petal.scale.y = 0.4;
      g.add(petal);
    }
    g.add(sphere(0.018, C.gold, x, 0.08, z, 8));
  }
  return g;
}

function cauldron() {
  const g = new THREE.Group();
  const wood = mat("#9b5d34");
  [0, 1.05, 2.1].forEach((a) => {
    const l = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 10), wood, 0, 0.04, 0);
    l.rotation.z = Math.PI / 2;
    l.rotation.y = a;
    g.add(l);
  });
  [0, 2.1, 4.2].forEach((a) => g.add(mesh(new THREE.ConeGeometry(0.05, 0.16, 8), glow("#ff9b2e", 2), Math.cos(a) * 0.05, 0.1, Math.sin(a) * 0.05)));
  const pot = mesh(new THREE.SphereGeometry(0.17, 24, 16, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.7), mat("#2b2d3a", { roughness: 0.4, metalness: 0.4, side: THREE.DoubleSide }), 0, 0.26, 0);
  g.add(pot);
  const drink = mesh(new THREE.CircleGeometry(0.135, 24), glow(C.calimocho, 0.5), 0, 0.36, 0);
  drink.rotation.x = -Math.PI / 2;
  g.add(drink);
  [[0.04, 0.38, 0.02], [-0.05, 0.39, -0.03]].forEach(([x, y, z]) => g.add(sphere(0.03, glow("#ff4f8b", 0.6), x, y, z, 10)));
  return g;
}

function tent() {
  const g = new THREE.Group();
  const tri = new THREE.Shape();
  tri.moveTo(-0.38, 0);
  tri.lineTo(0.38, 0);
  tri.lineTo(0, 0.55);
  tri.closePath();
  const body = new THREE.ExtrudeGeometry(tri, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  body.translate(0, 0, -0.35);
  const m = mesh(body, mat("#ffa53a", { roughness: 0.7 }));
  m.rotation.y = Math.PI / 4;
  g.add(m);
  const door = new THREE.Shape();
  door.moveTo(-0.14, 0);
  door.lineTo(0.14, 0);
  door.lineTo(0, 0.32);
  door.closePath();
  const d = mesh(new THREE.ShapeGeometry(door), mat("#7a3b10"));
  d.rotation.y = Math.PI / 4;
  d.position.set(0.255, 0.001, 0.255);
  g.add(d);
  g.add(cyl(0.01, 0.01, 0.35, "#6b4a2f", -0.18, 0.5, -0.18, 6));
  const flag = mesh(new THREE.PlaneGeometry(0.16, 0.1), mat("#3fe0a0", { side: THREE.DoubleSide }), -0.1, 0.8, -0.18);
  g.add(flag);
  return g;
}

function rocket() {
  const g = new THREE.Group();
  const body = mat("#f2f2f7", { roughness: 0.35, metalness: 0.2 });
  const red = mat(C.red, { roughness: 0.5 });
  g.add(cyl(0.16, 0.13, 0.55, body, 0, 0.12, 0));
  g.add(mesh(new THREE.ConeGeometry(0.16, 0.3, 24), red, 0, 0.82, 0));
  [0, 2.1, 4.2].forEach((a) => {
    const fin = mesh(new THREE.BoxGeometry(0.03, 0.22, 0.16), red, Math.cos(a) * 0.15, 0.2, Math.sin(a) * 0.15);
    fin.rotation.y = -a;
    g.add(fin);
  });
  const win = mesh(new THREE.CircleGeometry(0.06, 20), glow("#7fe6ff", 0.5), 0.1, 0.52, 0.12);
  win.lookAt(1, 0.52, 1.2);
  g.add(win);
  // aterrizaje forzoso: un poco torcido y echando humo
  g.rotation.z = -0.25;
  g.rotation.x = 0.15;
  const smoke = new THREE.Group();
  [[0.05, 0.05, 0.2, 0.09], [0.2, 0.12, 0.12, 0.07], [-0.12, 0.04, 0.15, 0.06]].forEach(([x, y, z, r]) => smoke.add(sphere(r, mat("#e7e3f0", { roughness: 1 }), x, y, z, 12)));
  const out = new THREE.Group();
  out.add(g, smoke);
  return out;
}

function pond() {
  const g = new THREE.Group();
  const rim = mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.02, 48), mat("#7fc451"), 0, 0.001, 0);
  rim.scale.z = 0.62;
  g.add(rim);
  const lake = mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.03, 48), mat(C.calimocho, { roughness: 0.15, metalness: 0.1 }), 0, 0.01, 0);
  lake.scale.z = 0.55;
  g.add(lake);
  [[0.4, 0.12], [-0.45, -0.08], [0.1, -0.25]].forEach(([x, z]) => {
    const pad = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 16, 1), mat("#6fcf4a"), x, 0.045, z);
    g.add(pad);
  });
  return g;
}

function crater() {
  const g = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(0.42, 0.09, 12, 40), mat("#86c454"), 0, 0.01, 0);
  ring.rotation.x = Math.PI / 2;
  ring.scale.y = 0.75;
  g.add(ring);
  const hole = mesh(new THREE.CircleGeometry(0.42, 40), mat("#3d7a2a"), 0, 0.012, 0);
  hole.rotation.x = -Math.PI / 2;
  hole.scale.y = 0.75;
  g.add(hole);
  return g;
}

function sign() {
  const g = new THREE.Group();
  const wood = mat("#a8683f");
  g.add(cyl(0.025, 0.025, 0.5, wood));
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 96;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#b3743f";
  c.fillRect(0, 0, 256, 96);
  c.fillStyle = "#fff4e0";
  c.font = '900 56px "DejaVu Sans", Arial, sans-serif';
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("SALIDA", 128, 52);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = mesh(new RoundedBoxGeometry(0.62, 0.24, 0.04, 2, 0.02), [wood, wood, wood, wood, mat("#ffffff", { map: tex }), wood] as unknown as THREE.Material, 0, 0.5, 0.03);
  board.rotation.y = Math.PI / 4; // de cara a la cámara
  g.add(board);
  return g;
}

/** Vasos rojos de fiesta tirados por el césped (la personalidad del planeta). */
function partyCups(v: number) {
  const g = new THREE.Group();
  const red = mat("#e8343f", { roughness: 0.45 });
  const inside = mat("#fff6ec");
  const a = mesh(new THREE.CylinderGeometry(0.06, 0.042, 0.13, 16, 1, true), red, 0, 0.065, 0);
  g.add(a, mesh(new THREE.CircleGeometry(0.058, 16), inside, 0, 0.128, 0));
  (g.children[1] as THREE.Mesh).rotation.x = -Math.PI / 2;
  const b = mesh(new THREE.CylinderGeometry(0.06, 0.042, 0.13, 16), red, 0.16, 0.045, 0.06);
  b.rotation.z = Math.PI / 2;
  b.rotation.y = v * 3;
  g.add(b);
  return g;
}

/** Guirnalda de luces de fiesta entre dos puntos. */
function fairyLights(a: THREE.Vector3, b: THREE.Vector3, n = 14) {
  const g = new THREE.Group();
  const colors = ["#ffd84a", "#ff6fb5", "#6ff0ff", "#9dff6a"];
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * 0.25;
    pts.push(p);
    if (i > 0 && i < n) g.add(sphere(0.035, glow(colors[i % colors.length], 2.2), p.x, p.y - 0.04, p.z, 10));
  }
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.006, 4), mat("#3b2c4a"));
  g.add(wire);
  return g;
}

/** Las cosas bajitas, más grandes para que se lean desde el sofá. */
const PROP_SCALE: Partial<Record<Deco["kind"], number>> = { bush: 1.6, mush: 1.9, rock: 1.7, logs: 1.6, flowers: 1.8, cauldron: 1.9, tree: 1.15, tree2: 1.15, ptree: 1.15, pine: 1.1, rocket: 1.4, sign: 1.3, tent: 1.2 };

function decoration(d: Deco) {
  const v = vary(d.gx, d.gy);
  let o: THREE.Object3D;
  switch (d.kind) {
    case "pine":
      o = pine(v);
      break;
    case "tree":
      o = roundTree(C.leaf, v);
      break;
    case "tree2":
      o = roundTree(C.leaf, v, true);
      break;
    case "ptree":
      o = roundTree(C.pink, v);
      break;
    case "bush":
      o = bush();
      break;
    case "mush": {
      o = new THREE.Group();
      o.add(mushroom(0, 0, 1), mushroom(0.16, 0.1, 0.7), mushroom(-0.1, 0.14, 0.55));
      break;
    }
    case "rock":
      o = crystalRock();
      break;
    case "logs":
      o = logs();
      break;
    case "flowers":
      o = flowers(v);
      break;
    case "cauldron":
      o = cauldron();
      break;
    case "tent":
      o = tent();
      break;
    case "rocket":
      o = rocket();
      break;
    case "pond":
      o = pond();
      break;
    case "crater":
      o = crater();
      break;
    case "sign":
      o = sign();
      break;
  }
  o.position.set(d.gx, 0, d.gy);
  o.scale.multiplyScalar(PROP_SCALE[d.kind] ?? 1);
  if (!["pond", "crater", "sign", "tent", "rocket"].includes(d.kind)) o.rotation.y += v * Math.PI * 2;
  return shadowed(o);
}

// --- La Nave Nodriza (meta) ---------------------------------------------------------
function mothership(at = isoPos(BOARD.length)) {
  const { gx, gy } = at;
  const g = new THREE.Group();
  const pedestal = mesh(new RoundedBoxGeometry(1.25, 0.5, 1.25, 4, 0.1), mat(C.gold, { roughness: 0.35, metalness: 0.3 }), 0, 0.17, 0);
  g.add(shadowed(pedestal));
  const ship = new THREE.Group();
  const hull = mesh(new THREE.SphereGeometry(1.25, 48, 24), mat("#c9c3e6", { roughness: 0.25, metalness: 0.6 }));
  hull.scale.y = 0.26;
  ship.add(hull);
  const belly = mesh(new THREE.SphereGeometry(0.7, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat("#7a6fc0", { roughness: 0.4, metalness: 0.5 }), 0, -0.05, 0);
  belly.scale.y = 0.45;
  ship.add(belly);
  const dome = mesh(new THREE.SphereGeometry(0.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat("#9ff3ff", { roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75, emissive: "#5fd7ff", emissiveIntensity: 0.25 }), 0, 0.18, 0);
  ship.add(dome);
  const colors = ["#ffd84a", "#ff6fb5", "#6ff0ff", "#9dff6a"];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ship.add(sphere(0.06, glow(colors[i % 4], 2.5), Math.cos(a) * 1.18, 0.02, Math.sin(a) * 1.18, 10));
  }
  // bola de discoteca colgando: es una nave de fiesta
  ship.add(cyl(0.008, 0.008, 0.25, "#888", 0, -0.55, 0, 6));
  ship.add(sphere(0.12, mat("#f0f0ff", { roughness: 0.1, metalness: 1, flatShading: true }), 0, -0.6, 0, 8));
  ship.position.y = 2.05;
  ship.rotation.z = 0.05;
  g.add(shadowed(ship));
  // rayo abductor
  const beam = mesh(new THREE.CylinderGeometry(0.45, 0.75, 1.55, 32, 1, true), new THREE.MeshBasicMaterial({ color: "#b8ffef", transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }), 0, 1.2, 0);
  g.add(beam);
  g.position.set(gx, 0, gy);
  return g;
}

// --- Escena y render ------------------------------------------------------------------
function lights(scene: THREE.Scene, target: THREE.Vector3, shadowSize: number) {
  scene.add(new THREE.HemisphereLight("#e6f2ff", "#86b85c", 1.1));
  scene.add(new THREE.AmbientLight("#fff3e6", 0.25));
  const sun = new THREE.DirectionalLight("#fff0d8", 2.3);
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
  r.toneMappingExposure = 1.0;
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
export function renderBoard(scale: number) {
  const scene = new THREE.Scene();
  scene.add(island(), tiles(), mothership());
  for (const d of DECOR) scene.add(decoration(d));
  // personalidad: vasos de fiesta por el césped y guirnaldas de luces en el bosque del fondo
  for (const [gx, gy] of [[2.6, 7.4], [8, 7.7], [5, 4.3], [11, 4.8], [3.4, 1.8], [9.4, 1.3], [12.8, 7.3]]) {
    const c = shadowed(partyCups(vary(gx, gy, 2)));
    c.position.set(gx, 0, gy);
    c.scale.setScalar(1.8);
    scene.add(c);
  }
  scene.add(fairyLights(new THREE.Vector3(0.3, 1.25, -1), new THREE.Vector3(4.6, 1.25, -1)));
  scene.add(fairyLights(new THREE.Vector3(8.4, 1.15, -1), new THREE.Vector3(12.6, 1.15, -1)));
  scene.add(fairyLights(new THREE.Vector3(-1, 1.15, 1.6), new THREE.Vector3(-1, 1.15, 4.6), 10));
  lights(scene, new THREE.Vector3(6.5, 0, 4.5), 8192);
  const w = Math.round(VIEW.w * scale);
  const h = Math.round(VIEW.h * scale);
  const r = renderer(w, h);
  r.render(scene, isoCamera(VIEW.x, VIEW.y, VIEW.w, VIEW.h));
  return r.domElement.toDataURL("image/png");
}

// --- Marcianos ------------------------------------------------------------------------
// Todos comparten la misma silueta (cuerpo de gominola: ancho abajo, redondo arriba, patitas
// y bracitos cortos) y su vaso de fiesta; cada uno se distingue por su "disfraz", como una
// colección de muñecos. Se construyen mirando a +z y luego se giran hacia la cámara.

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

type Look = "antenas" | "astronauta" | "cumple" | "dj" | "pirata" | "ciclope" | "rey" | "mago";
const LOOKS: Look[] = ["antenas", "astronauta", "cumple", "dj", "pirata", "ciclope", "rey", "mago"];
const INK = "#1b1f4b";

function eye(size = 0.075) {
  const g = new THREE.Group();
  const white = sphere(size, mat("#ffffff", { roughness: 0.15 }), 0, 0, 0, 24);
  white.scale.z = 0.6;
  const pupil = sphere(size * 0.6, mat(INK, { roughness: 0.15 }), 0, -size * 0.05, size * 0.38, 20);
  pupil.scale.z = 0.6;
  const shine = sphere(size * 0.2, mat("#ffffff", { roughness: 0.1 }), size * 0.22, size * 0.18, size * 0.62, 10);
  g.add(white, pupil, shine);
  return g;
}

function smile(open = false) {
  if (open) {
    const g = new THREE.Group();
    const m = sphere(0.05, mat("#3a1030", { roughness: 0.6 }), 0, 0, 0, 16);
    m.scale.set(1.2, 0.8, 0.35);
    const tongue = sphere(0.025, mat("#ff6f8e"), 0, -0.018, 0.012, 12);
    tongue.scale.z = 0.4;
    g.add(m, tongue);
    return g;
  }
  // el arco va dentro de un grupo: stick() reorienta el grupo y el arco sigue boca arriba (sonrisa)
  const g = new THREE.Group();
  const m = mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20, Math.PI), mat(INK));
  m.rotation.z = Math.PI;
  g.add(m);
  return g;
}

function cheeks(g: THREE.Group, y = MOUTH_Y + 0.03) {
  for (const s of [-1, 1]) {
    const c = sphere(0.038, mat("#ff8fb0", { roughness: 0.7 }), 0, 0, 0, 12);
    c.scale.z = 0.3;
    g.add(stick(c, y, s * 0.17, -0.004));
  }
}

function star(r: number, color: string, depth = 0.03) {
  const sh = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * k + Math.PI / 2;
    if (k === 0) sh.moveTo(rr * Math.cos(a), rr * Math.sin(a));
    else sh.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return mesh(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: depth * 0.4, bevelThickness: depth * 0.4, bevelSegments: 2 }), mat(color, { roughness: 0.4 }));
}

function stripedTexture(a: string, b: string) {
  const cv = document.createElement("canvas");
  cv.width = 64;
  cv.height = 64;
  const c = cv.getContext("2d")!;
  for (let i = 0; i < 8; i++) {
    c.fillStyle = i % 2 ? a : b;
    c.fillRect(0, i * 8, 64, 8);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function alien(color: string, look: Look) {
  const g = new THREE.Group();
  const skin = mat(color, { roughness: 0.5 });
  const dark = mat("#" + lighten(color, -0.3).getHexString(), { roughness: 0.6 });
  const pale = "#" + lighten(color, 0.35).getHexString();

  // cuerpo, patitas y bracitos (iguales para todos)
  g.add(mesh(new THREE.LatheGeometry(BODY_PROFILE, 64), skin));
  for (const s of [-1, 1]) {
    const foot = sphere(0.085, dark, s * 0.15, 0.03, 0.12, 20);
    foot.scale.set(1, 0.55, 1.25);
    g.add(foot);
  }
  // bracitos cortos a los lados (como muñones); el izquierdo sujeta el vaso
  for (const s of [-1, 1]) {
    const arm = sphere(0.075, skin, s * 0.36, 0.3, 0.06, 20);
    arm.scale.set(0.8, 1.25, 0.8);
    arm.rotation.z = s * 0.5;
    g.add(arm);
  }
  // el vaso de fiesta, en la mano izquierda
  const cup = mesh(new THREE.CylinderGeometry(0.065, 0.048, 0.14, 20), mat("#e8343f", { roughness: 0.45 }), -0.38, 0.27, 0.18);
  const drink = mesh(new THREE.CircleGeometry(0.061, 20), glow(C.calimocho, 0.3), -0.38, 0.341, 0.18);
  drink.rotation.x = -Math.PI / 2;
  g.add(cup, drink);

  // cara por defecto: dos ojos, mofletes y sonrisa
  const face = (eyes = true, mouthOpen = false) => {
    if (eyes) for (const s of [-1, 1]) g.add(stick(eye(), EYE_Y, s * 0.11, -0.01));
    cheeks(g);
    g.add(stick(smile(mouthOpen), MOUTH_Y, 0, 0.002));
  };

  switch (look) {
    case "antenas":
      face();
      for (const s of [-1, 1]) {
        const ant = new THREE.Group();
        ant.add(cyl(0.014, 0.014, 0.24, dark, 0, 0, 0, 8), sphere(0.05, glow(pale, 0.5), 0, 0.26, 0, 16));
        ant.position.set(s * 0.08, TOP - 0.06, 0);
        ant.rotation.z = -s * 0.4;
        g.add(ant);
      }
      break;
    case "astronauta": {
      face();
      const helmet = mesh(new THREE.SphereGeometry(0.47, 40, 30), mat("#bff4ff", { roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false }), 0, 0.56, 0);
      g.add(helmet);
      const collar = mesh(new THREE.TorusGeometry(0.375, 0.035, 12, 40), mat("#e9ecf6", { roughness: 0.3, metalness: 0.4 }), 0, 0.2, 0);
      collar.rotation.x = Math.PI / 2;
      g.add(collar);
      g.add(stick(star(0.06, C.gold), 0.24, 0, 0.0));
      break;
    }
    case "cumple": {
      face(true, true);
      const hat = mesh(new THREE.ConeGeometry(0.15, 0.36, 24), mat("#ffffff", { map: stripedTexture("#ffd84a", "#3fc2ff"), roughness: 0.5 }), 0.03, TOP + 0.12, -0.02);
      hat.rotation.z = -0.2;
      g.add(hat, sphere(0.05, mat("#ff5fa2"), -0.01, TOP + 0.3, -0.02, 16));
      const confetti = ["#ffd84a", "#3fc2ff", "#9dff6a", "#ffffff"];
      [[0.28, -0.2], [0.2, 0.22], [0.66, -0.24], [0.7, 0.2], [0.14, 0.05]].forEach(([y, sd], k) => {
        const c = sphere(0.02, mat(confetti[k % 4]), 0, 0, 0, 8);
        c.scale.z = 0.3;
        g.add(stick(c, y, sd, -0.002));
      });
      break;
    }
    case "dj": {
      // gafas de sol en vez de ojos
      for (const s of [-1, 1]) {
        const lens = mesh(new RoundedBoxGeometry(0.15, 0.09, 0.03, 3, 0.03), mat(INK, { roughness: 0.15, metalness: 0.3 }));
        g.add(stick(lens, EYE_Y, s * 0.09, 0.012));
      }
      g.add(stick(mesh(new THREE.BoxGeometry(0.06, 0.015, 0.015), mat(INK)), EYE_Y + 0.01, 0, 0.02));
      cheeks(g);
      g.add(stick(smile(true), MOUTH_Y - 0.01, 0, 0.002));
      const band = mesh(new THREE.TorusGeometry(0.33, 0.025, 10, 40, Math.PI), mat("#2b2d3a", { roughness: 0.4 }), 0, 0.6, 0);
      g.add(band);
      for (const s of [-1, 1]) {
        const cupEar = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 24), mat("#ff4f8b", { roughness: 0.4 }), s * 0.34, 0.6, 0);
        cupEar.rotation.z = Math.PI / 2;
        g.add(cupEar);
      }
      break;
    }
    case "pirata": {
      g.add(stick(eye(), EYE_Y, -0.11, -0.01));
      const patch = sphere(0.07, mat(INK, { roughness: 0.5 }), 0, 0, 0, 16);
      patch.scale.z = 0.35;
      g.add(stick(patch, EYE_Y + 0.01, 0.11, 0.0));
      const strap = mesh(new THREE.TorusGeometry(0.33, 0.01, 6, 48), mat(INK), 0, 0.62, 0);
      strap.rotation.set(Math.PI / 2 - 0.25, 0, 0);
      g.add(strap);
      cheeks(g);
      g.add(stick(smile(), MOUTH_Y, 0, 0.002));
      const bandana = mesh(new THREE.SphereGeometry(0.33, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.2), mat("#2a3c9a", { roughness: 0.6 }), 0, 0.6, -0.005);
      bandana.scale.set(1.06, 0.95, 1.06);
      g.add(bandana);
      for (const k of [0.4, -0.3]) g.add(sphere(0.02, mat("#ffffff"), Math.sin(k) * 0.3, 0.76, Math.cos(k) * 0.22, 8));
      const knot = sphere(0.06, mat("#2a3c9a"), -0.12, 0.7, -0.29, 16);
      g.add(knot);
      const ring = mesh(new THREE.TorusGeometry(0.035, 0.01, 8, 20), mat(C.gold, { metalness: 0.8, roughness: 0.3 }), 0.35, 0.5, 0.06);
      g.add(ring);
      break;
    }
    case "ciclope": {
      g.add(stick(eye(0.12), EYE_Y, 0, -0.02));
      cheeks(g, MOUTH_Y - 0.01);
      g.add(stick(smile(true), MOUTH_Y - 0.04, 0, 0.002));
      for (const s of [-1, 1]) {
        const horn = mesh(new THREE.ConeGeometry(0.045, 0.14, 16), mat("#fff4e0", { roughness: 0.5 }), s * 0.14, TOP - 0.04, 0);
        horn.rotation.z = -s * 0.35;
        g.add(horn);
      }
      break;
    }
    case "rey": {
      face();
      const crown = new THREE.Group();
      const gold = mat(C.gold, { metalness: 0.7, roughness: 0.3 });
      crown.add(mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.08, 32, 1, true), new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }), 0, 0.04, 0));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        crown.add(mesh(new THREE.ConeGeometry(0.035, 0.08, 4), gold, Math.cos(a) * 0.17, 0.12, Math.sin(a) * 0.17));
        crown.add(sphere(0.018, glow(["#ff4f8b", "#6ff0ff", "#9dff6a"][k % 3], 0.4), Math.cos(a) * 0.175, 0.05, Math.sin(a) * 0.175, 8));
      }
      crown.position.y = TOP - 0.08;
      crown.rotation.z = 0.12;
      g.add(crown);
      // pajarita
      const bow = new THREE.Group();
      for (const s of [-1, 1]) {
        const w = mesh(new THREE.ConeGeometry(0.05, 0.09, 4), mat("#c2185b"), s * 0.045, 0, 0);
        w.rotation.z = (s * Math.PI) / 2;
        bow.add(w);
      }
      bow.add(sphere(0.022, mat("#c2185b"), 0, 0, 0.01, 10));
      g.add(stick(bow, 0.24, 0, 0.01));
      break;
    }
    case "mago": {
      for (const s of [-1, 1]) g.add(stick(eye(0.065), EYE_Y, s * 0.1, -0.01));
      cheeks(g, MOUTH_Y + 0.06);
      // barba blanca
      [[0.42, 0, 0.07], [0.37, -0.07, 0.055], [0.37, 0.07, 0.055], [0.3, 0, 0.06]].forEach(([y, sd, r]) => {
        const b = sphere(r, mat("#f4f1ff", { roughness: 0.9 }), 0, 0, 0, 16);
        g.add(stick(b, y, sd, -0.02));
      });
      const hat = mesh(new THREE.ConeGeometry(0.28, 0.5, 32), mat("#3b2a8f", { roughness: 0.6 }), 0, TOP + 0.17, -0.02);
      hat.rotation.set(-0.15, 0, -0.18);
      const brim = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 40), mat("#3b2a8f", { roughness: 0.6 }), 0, TOP - 0.08, 0);
      g.add(hat, brim);
      [[0.95, 0.12, 0.2], [1.09, -0.05, 0.12], [0.87, -0.15, 0.24]].forEach(([y, x, z]) => {
        const st = star(0.035, C.gold, 0.01);
        st.position.set(x, y, z);
        st.lookAt(x * 3, y, 2);
        g.add(st);
      });
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
    scene.add(meta ? mothership({ gx: 0, gy: 0 }) : tile(type, 0, 0));
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
    __render?: () => { board: string; aliens: string[]; icons: Record<string, string> };
  }
}
window.__render = () => ({ board: renderBoard(2.5), aliens: renderAliens(320), icons: renderTileIcons(256) });
