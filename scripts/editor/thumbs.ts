// Página que renderiza la miniatura de cada modelo del catálogo (la abre catalog.mjs en Chromium sin pantalla).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const SIZE = 256;

async function thumbs(files: string[]): Promise<Record<string, string>> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#ffffff", "#8a8a8a", 2.2));
  const sun = new THREE.DirectionalLight("#ffffff", 1.6);
  sun.position.set(3, 6, 4);
  scene.add(sun);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
  const loader = new GLTFLoader();
  const out: Record<string, string> = {};
  for (const file of files) {
    try {
      const gltf = await loader.loadAsync(file);
      const model = gltf.scene;
      scene.add(model);
      // misma vista que el tablero: isométrica desde +x +z
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const dir = new THREE.Vector3(1, Math.tan(Math.PI / 6) * Math.SQRT2, 1).normalize();
      camera.position.copy(center).addScaledVector(dir, 100);
      camera.lookAt(center);
      camera.updateMatrixWorld();
      // encuadre: proyecta las esquinas de la caja en la vista de la cámara
      const inv = camera.matrixWorldInverse;
      let r = 0;
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const p = new THREE.Vector3(x, y, z).applyMatrix4(inv);
            const c = center.clone().applyMatrix4(inv);
            r = Math.max(r, Math.abs(p.x - c.x), Math.abs(p.y - c.y));
          }
      r *= 1.08;
      Object.assign(camera, { left: -r, right: r, top: r, bottom: -r });
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      out[file] = renderer.domElement.toDataURL("image/png");
      scene.remove(model);
    } catch (e) {
      console.error("no se pudo cargar", file, String(e));
    }
  }
  return out;
}

(window as unknown as { __thumbs: typeof thumbs }).__thumbs = thumbs;
