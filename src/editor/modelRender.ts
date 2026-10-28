// Dibuja un modelo 3D a una imagen con la cámara isométrica de la TV: la miniatura del catálogo y las fichas de los
// jugadores. Usa su propio renderer temporal (con fondo transparente), así no toca la escena del editor.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DEFAULT_TV_VIEW, tvDirection, type TvView } from "./layout";

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Object3D>>();

/** Carga un .glb (con caché) y le quita lo metálico: sin reflejos que reflejar, los metales se ven negros. */
export function loadModelScene(url: string): Promise<THREE.Object3D> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((g) => {
      g.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) for (const m of [mesh.material].flat() as THREE.MeshStandardMaterial[]) if ("metalness" in m) m.metalness = 0;
      });
      return g.scene;
    });
    cache.set(url, p);
  }
  return p;
}

/** Carga un .glb que el usuario eligió en su computador (sin caché: aún no tiene dirección). */
export async function parseModelFile(file: File): Promise<THREE.Object3D> {
  const url = URL.createObjectURL(file);
  try {
    return await new GLTFLoader().loadAsync(url).then((g) => {
      g.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) for (const m of [mesh.material].flat() as THREE.MeshStandardMaterial[]) if ("metalness" in m) m.metalness = 0;
      });
      return g.scene;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Tamaño (ancho, alto, fondo) del modelo sin escalar. */
export function sizeOf(root: THREE.Object3D) {
  return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
}

/** Escala con la que un modelo recién subido entra al tablero: su lado mayor mide unas 2 casillas. */
export function defaultScaleFor(root: THREE.Object3D): number {
  const s = sizeOf(root);
  const longest = Math.max(s.x, s.y, s.z);
  return longest > 0 ? Math.round(Math.min(50, Math.max(0.01, 2 / longest)) * 1000) / 1000 : 1;
}

const ISO_DIR = new THREE.Vector3(1, Math.tan(Math.PI / 6) * Math.SQRT2, 1).normalize();

function lights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight("#ffffff", "#8a8a8a", 2.2));
  const sun = new THREE.DirectionalLight("#ffffff", 1.6);
  sun.position.set(3, 6, 4);
  scene.add(sun);
}

/**
 * Renderiza `scene` con la vista de la TV, encuadrando lo que ocupa `subject`. Con `bottom` el objeto queda pegado
 * abajo (las fichas: así todas se apoyan igual en la casilla); si no, centrado (miniaturas).
 */
function shoot(scene: THREE.Scene, subject: THREE.Object3D, width: number, height: number, opts: { margin: number; bottom: boolean; quality: number; dir?: THREE.Vector3 }): string {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
  const box = new THREE.Box3().setFromObject(subject);
  const center = box.getCenter(new THREE.Vector3());
  camera.position.copy(center).addScaledVector(opts.dir ?? ISO_DIR, 100);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  const inv = camera.matrixWorldInverse;
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        const p = new THREE.Vector3(x, y, z).applyMatrix4(inv);
        [minX, maxX, minY, maxY] = [Math.min(minX, p.x), Math.max(maxX, p.x), Math.min(minY, p.y), Math.max(maxY, p.y)];
      }
  const m = 1 + opts.margin;
  let hw = ((maxX - minX) / 2) * m;
  let hh = ((maxY - minY) / 2) * m;
  // se ensancha o se alarga lo que haga falta para respetar la proporción de la imagen
  if (hw / hh > width / height) hh = (hw * height) / width;
  else hw = (hh * width) / height;
  const cx = (minX + maxX) / 2;
  const cy = opts.bottom ? minY - ((maxY - minY) / 2) * opts.margin + hh : (minY + maxY) / 2;
  Object.assign(camera, { left: cx - hw, right: cx + hw, top: cy + hh, bottom: cy - hh });
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/webp", opts.quality);
  renderer.dispose();
  renderer.forceContextLoss();
  return url;
}

/** Miniatura 128×128 de un modelo para el catálogo. */
export function renderThumb(root: THREE.Object3D): string {
  const scene = new THREE.Scene();
  lights(scene);
  const model = root.clone(true);
  scene.add(model);
  return shoot(scene, model, 128, 128, { margin: 0.08, bottom: false, quality: 0.82 });
}

/** Proporción de la imagen de una ficha (la de los zombis de serie, 202×327). */
export const TOKEN_IMAGE = { width: 252, height: 408 };

/**
 * La ficha de un jugador: el modelo mirando a la cámara (más el giro elegido), de pie sobre una peana del color del
 * jugador si `base` está activo. Siempre encuadrada igual, con los pies abajo.
 */
export function renderToken(root: THREE.Object3D, spec: { turn: number; base: boolean }, color: string, view: TvView = DEFAULT_TV_VIEW): string {
  const scene = new THREE.Scene();
  lights(scene);
  const model = root.clone(true);
  // normaliza: el modelo mide ~1 de alto (o su ancho ~0.7 si es más ancho que alto) y se apoya en el suelo, centrado
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = 1 / Math.max(size.y, 0.7 * Math.max(size.x, size.z), 1e-6);
  const holder = new THREE.Group();
  model.scale.setScalar(k);
  const nb = new THREE.Box3().setFromObject(model);
  model.position.set(-(nb.min.x + nb.max.x) / 2, -nb.min.y, -(nb.min.z + nb.max.z) / 2);
  holder.add(model);
  holder.rotation.y = ((view.az + spec.turn) * Math.PI) / 180; // de frente a la cámara de la TV
  scene.add(holder);
  if (spec.base) {
    const r = Math.max(0.38, 0.55 * Math.max(nb.max.x - nb.min.x, nb.max.z - nb.min.z));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, 0.08, 40), new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
    disc.position.y = -0.04;
    scene.add(disc);
  }
  return shoot(scene, scene, TOKEN_IMAGE.width, TOKEN_IMAGE.height, { margin: 0.05, bottom: true, quality: 0.88, dir: new THREE.Vector3(...tvDirection(view)) });
}
