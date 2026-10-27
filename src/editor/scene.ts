// Escena 3D del editor del tablero (Three.js en el navegador del admin). El diseño (BoardLayout) vive en
// React; esta clase solo lo dibuja (setLayout), recoge el ratón y avisa con callbacks.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { builtinIcon, drawIcon } from "./icons";
import { lightOf, NUMBER_FONTS, type NumberFont, type NumberStyle } from "./layout";
import { brushCells, GROUNDS, groundAt, LEVEL, LIQUIDS, lookOf, TILE_SIZE, tileAnchor, tileTypeOf, type BoardLayout, type TileKind, type LightId, type PlacedObject } from "./layout";

export type Tool = "select" | "paint" | "raise" | "lower" | "flatten" | "stamp" | "tiles";
export type GizmoMode = "translate" | "rotate" | "scale";

export type SceneEvents = {
  /** Trazo de pincel sobre una celda (phase "start" al apretar, "move" al pasar a otra celda). */
  onStroke: (x: number, y: number, phase: "start" | "move") => void;
  onStrokeEnd: () => void;
  onSelect: (id: string | null) => void;
  /** Un objeto cambió con el gizmo; `final` al soltar el ratón. */
  onObjectEdited: (o: PlacedObject, final: boolean) => void;
  /** Clic con la herramienta de sellar: colocar el modelo en ese punto. */
  onStamp: (x: number, y: number, z: number) => void;
};

const BASE = -0.8; // fondo del bloque de tierra del mundo
const CAM_DIST = 200;
/** Colores de las casillas estilo carretera. */
const ROAD = { asphalt: "#4a4d54", edge: "#2c2e33" }; // distancia de la cámara ortográfica al centro (la niebla se mide desde ahí)

/** Variación de color estable por celda (da el aspecto de baldosas de la referencia). */
function cellShade(i: number) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return 0.93 + (s - Math.floor(s)) * 0.14;
}

const LIGHT_PRESETS: Record<
  LightId,
  /** fog: dónde empieza y acaba la niebla, en tamaños del mundo por delante/detrás del centro. */
  { bg: string; fog: [number, number] | null; sky: string; ground: string; hemi: number; sun: string; sunI: number; sunPos: [number, number, number] }
> = {
  // Luz de relleno fuerte y sol suave: nada queda negro (el usuario no quiere zonas completamente oscuras).
  dia: { bg: "#bcd8f0", fog: null, sky: "#eef6ff", ground: "#9a8a72", hemi: 2.3, sun: "#fff3e0", sunI: 1.5, sunPos: [-10, 18, 3] },
  atardecer: { bg: "#e9a07a", fog: [0.2, 2.2], sky: "#ffd2b0", ground: "#7a5a60", hemi: 1.9, sun: "#ffa060", sunI: 1.5, sunPos: [-14, 10, 6] },
  noche: { bg: "#0e1420", fog: [0, 1.6], sky: "#6a80b0", ground: "#2a2e3a", hemi: 1.5, sun: "#9db8ff", sunI: 0.9, sunPos: [-8, 16, -4] },
  niebla: { bg: "#8a929a", fog: [-0.4, 1.0], sky: "#d9dfe4", ground: "#6a6a66", hemi: 2.1, sun: "#e8eef2", sunI: 0.7, sunPos: [-10, 18, 3] },
};

export class EditorScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 1000);
  private orbit: OrbitControls;
  private gizmo: TransformControls;
  private hemi = new THREE.HemisphereLight();
  private sun = new THREE.DirectionalLight();
  private terrain: THREE.Mesh;
  private liquid: THREE.Mesh;
  private grid = new THREE.Group();
  /** Borde de la zona editable (fuera el terreno sigue, pero no se edita). */
  private bounds = new THREE.Group();
  private brush: THREE.LineSegments;
  private objectRoot = new THREE.Group();
  private tileRoot = new THREE.Group();
  /** Tipos de letra de los números que ya se descargaron (hasta entonces se dibuja con la de respaldo). */
  private fontsReady = new Set<NumberFont>();
  private tileTextures = new Map<string, THREE.CanvasTexture>();
  private glowTexture: THREE.CanvasTexture | null = null;
  /** Imágenes de iconos subidos que aún se están cargando (la foto para la TV las espera). */
  private pendingIcons = new Set<Promise<void>>();
  private objects = new Map<string, THREE.Group>();
  private loader = new GLTFLoader();
  private models = new Map<string, Promise<THREE.Object3D | null>>();
  /** Caja de cada modelo cargado (sin girar ni escalar), para encajarlo en la rejilla. */
  private boxes = new Map<string, THREE.Box3>();
  private raycaster = new THREE.Raycaster();
  private layout: BoardLayout | null = null;
  private resizeObs: ResizeObserver;
  private frame = 0;

  private tool: Tool = "select";
  private brushSize = 1;
  private down: { x: number; y: number; button: number } | null = null;
  private stroking = false;
  private lastCell = "";
  private selected: string | null = null;
  private dragOffset = 0;
  private snap = true;

  /** Ruta de cada modelo del catálogo (id -> url del .glb). */
  modelUrl: (id: string) => string | undefined = () => undefined;

  constructor(
    private container: HTMLElement,
    private events: SceneEvents,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.scene.add(this.hemi, this.sun, this.sun.target, this.objectRoot, this.grid, this.bounds, this.tileRoot);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;

    this.terrain = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
    this.terrain.receiveShadow = true;
    this.terrain.castShadow = true;
    this.liquid = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.86 }),
    );
    this.liquid.receiveShadow = true;
    this.scene.add(this.terrain, this.liquid);

    this.brush = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.06, 1)),
      new THREE.LineBasicMaterial({ color: "#ffffff", depthTest: false, transparent: true, opacity: 0.9 }),
    );
    this.brush.renderOrder = 10;
    this.brush.visible = false;
    this.scene.add(this.brush);

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    // Como en Los Sims: el botón izquierdo es para editar; el derecho gira la cámara (con Shift, la desplaza);
    // la rueda acerca y la rueda apretada desplaza.
    this.orbit.mouseButtons = { LEFT: null as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    this.orbit.enableDamping = true;
    this.orbit.maxPolarAngle = Math.PI / 2.1;
    this.orbit.minZoom = 0.3;
    this.orbit.maxZoom = 8;
    this.orbit.screenSpacePanning = true;

    this.gizmo = new TransformControls(this.camera, this.renderer.domElement);
    this.gizmo.setSize(1.1);
    this.scene.add(this.gizmo.getHelper());
    this.gizmo.addEventListener("dragging-changed", (e) => {
      this.orbit.enabled = !e.value;
      const g = this.selectedGroup();
      if (e.value && g && this.layout) this.dragOffset = g.position.y - groundAt(this.layout, g.position.x, g.position.z);
      if (!e.value) {
        // al soltar tras girar o escalar, la huella cambió: se vuelve a encajar en la rejilla
        if (g && this.snap) {
          const p = this.snapXZ(g.userData.model, g.position.x, g.position.z, g.rotation.y, g.scale.y, g.userData.sx, g.userData.sz);
          if (this.layout) g.position.set(p.x, groundAt(this.layout, p.x, p.z) + (g.position.y - groundAt(this.layout, g.position.x, g.position.z)), p.z);
        }
        this.emitEdited(true);
      }
    });
    this.gizmo.addEventListener("objectChange", () => this.onGizmoChange());
    this.setGizmoMode("translate");

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointerleave", () => (this.brush.visible = false));
    el.addEventListener("contextmenu", (e) => e.preventDefault());

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.orbit.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObs.disconnect();
    window.removeEventListener("pointerup", this.onPointerUp);
    this.gizmo.dispose();
    this.orbit.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ------------------------------------------------------------------ cámara

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h);
    const view = this.layout ? (this.layout.w + this.layout.h) * 0.42 : 20;
    const aspect = w / h;
    Object.assign(this.camera, { left: (-view * aspect) / 2, right: (view * aspect) / 2, top: view / 2, bottom: -view / 2 });
    this.camera.updateProjectionMatrix();
  }

  /** Vista de la TV: isométrica desde +x +z, a 30° de altura, con todo el mundo encuadrado. */
  resetView() {
    if (!this.layout) return;
    const c = new THREE.Vector3(this.layout.w / 2, 0, this.layout.h / 2);
    const dir = new THREE.Vector3(1, Math.tan(Math.PI / 6) * Math.SQRT2, 1).normalize();
    this.camera.position.copy(c).addScaledVector(dir, CAM_DIST);
    this.camera.zoom = 1;
    this.orbit.target.copy(c);
    this.resize();
    this.orbit.update();
  }

  // ------------------------------------------------------------------ herramientas

  setTool(tool: Tool) {
    this.tool = tool;
    this.brush.visible = false;
    if (tool !== "select") this.select(null, false);
    this.renderer.domElement.style.cursor = tool === "select" ? "default" : "crosshair";
  }

  setBrushSize(size: number) {
    this.brushSize = size;
  }

  setSnap(on: boolean) {
    this.snap = on;
    this.setGizmoMode(this.gizmo.getMode() as GizmoMode);
  }

  setGizmoMode(mode: GizmoMode) {
    this.gizmo.setMode(mode);
    // con Ajustar, mover encaja en la rejilla (onGizmoChange) y girar va de 90° en 90°
    this.gizmo.setTranslationSnap(null);
    this.gizmo.setRotationSnap(this.snap ? Math.PI / 2 : null);
    this.gizmo.setScaleSnap(this.snap ? 0.1 : null);
    // Mover: solo sobre el suelo (la altura se ajusta sola). Girar: solo alrededor del eje vertical.
    this.gizmo.showX = mode !== "rotate";
    this.gizmo.showZ = mode !== "rotate";
    this.gizmo.showY = mode !== "translate";
  }

  setGrid(on: boolean) {
    this.grid.visible = on;
  }

  select(id: string | null, notify = true) {
    this.selected = id;
    const g = id ? this.objects.get(id) : undefined;
    if (g) this.gizmo.attach(g);
    else this.gizmo.detach();
    if (notify) this.events.onSelect(g ? id : null);
  }

  private selectedGroup() {
    return this.selected ? this.objects.get(this.selected) : undefined;
  }

  // ------------------------------------------------------------------ dibujar el diseño

  setLayout(l: BoardLayout) {
    const prev = this.layout;
    this.layout = l;
    if (!prev || prev.ground !== l.ground || prev.height !== l.height) {
      this.buildTerrain(l);
      this.buildGrid(l);
    }
    if (!prev || prev.w !== l.w || prev.h !== l.h) this.resetView();
    if (!prev || prev.light !== l.light || prev.shadow !== l.shadow) this.applyLight(l);
    if (!prev || prev.objects !== l.objects) this.syncObjects(l.objects);
    if (!prev || prev.tiles !== l.tiles || prev.tileStyles !== l.tileStyles || prev.numbers !== l.numbers || prev.height !== l.height || prev.ground !== l.ground)
      this.buildTiles(l);
  }

  private buildTerrain(l: BoardLayout) {
    const pos: number[] = [];
    const col: number[] = [];
    const lpos: number[] = [];
    const lcol: number[] = [];
    const c = new THREE.Color();
    const quad = (p: number[], cout: number[], color: THREE.Color, a: number[], b: number[], cc: number[], d: number[]) => {
      for (const v of [a, b, cc, a, cc, d]) {
        p.push(...v);
        cout.push(color.r, color.g, color.b);
      }
    };
    const solidTop = (i: number) => l.height[i] * LEVEL - (LIQUIDS.includes(l.ground[i]) ? 0.45 : 0);
    // El terreno sigue más allá del borde del mundo (copiando la celda del borde más cercana): así el tablero
    // no parece un cubo flotando en el vacío (pedido del usuario). Solo se edita y se juega dentro del mundo.
    const E = Math.max(l.w, l.h);
    const src = (x: number, y: number) => Math.min(Math.max(y, 0), l.h - 1) * l.w + Math.min(Math.max(x, 0), l.w - 1);
    for (let y = -E; y < l.h + E; y++)
      for (let x = -E; x < l.w + E; x++) {
        const i = src(x, y);
        const g = GROUNDS[l.ground[i]];
        const liquid = LIQUIDS.includes(l.ground[i]);
        const top = solidTop(i);
        const shade = cellShade((x + 1000) * 7919 + y);
        c.set(liquid ? g.side : g.top).multiplyScalar(shade);
        quad(pos, col, c, [x, top, y], [x, top, y + 1], [x + 1, top, y + 1], [x + 1, top, y]);
        if (liquid) {
          const s = l.height[i] * LEVEL - 0.15;
          c.set(g.top).multiplyScalar(0.97 + (shade - 1) * 0.3);
          quad(lpos, lcol, c, [x, s, y], [x, s, y + 1], [x + 1, s, y + 1], [x + 1, s, y]);
        }
        // lados: solo donde el vecino es más bajo (o al final del terreno)
        const sides: [number, number, number[], number[]][] = [
          [x + 1, y, [x + 1, 0, y + 1], [x + 1, 0, y]],
          [x - 1, y, [x, 0, y], [x, 0, y + 1]],
          [x, y + 1, [x, 0, y + 1], [x + 1, 0, y + 1]],
          [x, y - 1, [x + 1, 0, y], [x, 0, y]],
        ];
        for (const [nx, ny, a, b] of sides) {
          const inTerrain = nx >= -E && ny >= -E && nx < l.w + E && ny < l.h + E;
          const bottom = inTerrain ? solidTop(src(nx, ny)) : BASE;
          if (bottom >= top) continue;
          c.set(g.side).multiplyScalar(shade * (nx !== x ? 0.82 : 0.68));
          quad(pos, col, c, [a[0], bottom, a[2]], [b[0], bottom, b[2]], [b[0], top, b[2]], [a[0], top, a[2]]);
        }
      }
    const set = (mesh: THREE.Mesh, p: number[], cl: number[]) => {
      mesh.geometry.dispose();
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(cl, 3));
      geo.computeVertexNormals();
      mesh.geometry = geo;
    };
    set(this.terrain, pos, col);
    set(this.liquid, lpos, lcol);
  }

  /** Rejilla pegada a la cara de arriba de cada celda (sigue el terreno) y el borde de la zona editable. */
  private buildGrid(l: BoardLayout) {
    this.grid.clear();
    this.bounds.clear();
    let top = 0;
    for (const h of l.height) top = Math.max(top, h * LEVEL);
    const rim = [0, 0, l.w, 0, l.w, 0, l.w, l.h, l.w, l.h, 0, l.h, 0, l.h, 0, 0].flatMap((v, k) => (k % 2 ? [top + 0.02, v] : [v]));
    const rimGeo = new THREE.BufferGeometry();
    rimGeo.setAttribute("position", new THREE.Float32BufferAttribute(rim, 3));
    this.bounds.add(new THREE.LineSegments(rimGeo, new THREE.LineBasicMaterial({ color: "#ffd23f", depthTest: false, transparent: true, opacity: 0.8 })));
    const pts: number[] = [];
    for (let y = 0; y < l.h; y++)
      for (let x = 0; x < l.w; x++) {
        const t = l.height[y * l.w + x] * LEVEL - (LIQUIDS.includes(l.ground[y * l.w + x]) ? 0.15 : 0) + 0.01;
        pts.push(x, t, y, x + 1, t, y, x, t, y, x, t, y + 1);
        if (x === l.w - 1) pts.push(x + 1, t, y, x + 1, t, y + 1);
        if (y === l.h - 1) pts.push(x, t, y + 1, x + 1, t, y + 1);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#000000", transparent: true, opacity: 0.18 }));
    this.grid.add(lines);
  }

  private applyLight(l: BoardLayout) {
    const p = LIGHT_PRESETS[l.light];
    this.scene.background = new THREE.Color(p.bg);
    const size = Math.max(l.w, l.h);
    this.scene.fog = p.fog ? new THREE.Fog(p.bg, CAM_DIST + p.fog[0] * size, CAM_DIST + p.fog[1] * size) : null;
    this.hemi.color.set(p.sky);
    this.hemi.groundColor.set(p.ground);
    this.hemi.intensity = p.hemi;
    this.sun.color.set(p.sun);
    this.sun.intensity = p.sunI;
    this.sun.shadow.intensity = l.shadow;
    const c = new THREE.Vector3(l.w / 2, 0, l.h / 2);
    const k = Math.max(l.w, l.h) / 16;
    this.sun.position.set(c.x + p.sunPos[0] * k, p.sunPos[1] * k, c.z + p.sunPos[2] * k);
    this.sun.target.position.copy(c);
    const r = Math.hypot(l.w, l.h) / 2 + 4;
    Object.assign(this.sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 0.1, far: 400 });
    this.sun.shadow.camera.updateProjectionMatrix();
  }

  private loadModel(id: string): Promise<THREE.Object3D | null> {
    let p = this.models.get(id);
    if (!p) {
      const url = this.modelUrl(id);
      p = url
        ? this.loader.loadAsync(url).then(
            (g) => {
              g.scene.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                // algunos kits traen materiales metálicos: sin reflejos que reflejar se ven negros
                for (const m of [mesh.material].flat() as THREE.MeshStandardMaterial[]) if ("metalness" in m) m.metalness = 0;
              });
              this.boxes.set(id, new THREE.Box3().setFromObject(g.scene));
              return g.scene;
            },
            () => null,
          )
        : Promise.resolve(null);
      this.models.set(id, p);
    }
    return p;
  }

  private syncObjects(list: PlacedObject[]) {
    const keep = new Set(list.map((o) => o.id));
    for (const [id, g] of this.objects)
      if (!keep.has(id)) {
        if (this.selected === id) this.select(null);
        this.objectRoot.remove(g);
        this.objects.delete(id);
      }
    for (const o of list) {
      let g = this.objects.get(o.id);
      if (!g || g.userData.model !== o.model) {
        if (g) this.objectRoot.remove(g);
        const group = new THREE.Group();
        g = group;
        group.userData = { id: o.id, model: o.model };
        this.objects.set(o.id, group);
        this.objectRoot.add(group);
        this.loadModel(o.model).then((m) => {
          if (!m || this.objects.get(o.id) !== group) return;
          group.add(m.clone(true));
          if (group.userData.pending) this.applyObjectLight(group, group.userData.pending as PlacedObject); // la caja del modelo ya existe
        });
        if (this.selected === o.id) this.gizmo.attach(group);
      }
      g.position.set(o.x, o.y, o.z);
      g.rotation.set(o.rx, o.ry, o.rz);
      g.userData.sx = o.sx ?? 1;
      g.userData.sz = o.sz ?? 1;
      g.scale.set(o.s * g.userData.sx, o.s, o.s * g.userData.sz);
      g.userData.pending = o;
      this.applyObjectLight(g, o);
    }
  }

  /** Luz del objeto: un punto de luz cálido en lo alto del modelo y un halo que se ve en la foto de la TV. */
  private applyObjectLight(g: THREE.Group, o: PlacedObject) {
    const lt = lightOf(o);
    let rig = g.userData.rig as THREE.Group | undefined;
    if (!lt?.on) {
      if (rig) {
        g.remove(rig);
        (rig.children[1] as THREE.Sprite).material.dispose();
        g.userData.rig = undefined;
      }
      return;
    }
    const box = this.boxes.get(o.model);
    if (!box) return; // el modelo aún no cargó: se vuelve a llamar al cargar
    if (!rig) {
      const light = new THREE.PointLight();
      light.decay = 2;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      rig = new THREE.Group();
      rig.add(light, sprite);
      g.add(rig);
      g.userData.rig = rig;
    }
    const [light, sprite] = rig.children as [THREE.PointLight, THREE.Sprite];
    // en lo alto del modelo, donde está la llama o el cristal de la lámpara (coordenadas del modelo, sin escalar)
    rig.position.set((box.min.x + box.max.x) / 2, box.min.y + (box.max.y - box.min.y) * 0.72, (box.min.z + box.max.z) / 2);
    light.color.set(lt.color);
    light.intensity = lt.intensity;
    light.distance = lt.distance;
    sprite.material.color.set(lt.color);
    sprite.material.opacity = Math.min(0.85, 0.3 + lt.intensity / 250);
    const world = Math.min(3, 0.8 + lt.distance * 0.08); // tamaño del halo en casillas
    sprite.scale.set(world / g.scale.x, world / g.scale.y, 1);
  }

  private glow() {
    if (!this.glowTexture) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d")!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.25, "rgba(255,255,255,0.45)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      this.glowTexture = new THREE.CanvasTexture(c);
      this.glowTexture.colorSpace = THREE.SRGBColorSpace;
    }
    return this.glowTexture;
  }

  // ------------------------------------------------------------------ encajar en la rejilla

  /** Huella en el suelo de un modelo girado y escalado, relativa a su punto de apoyo. */
  private footprint(model: string, ry: number, s: number, sx = 1, sz = 1) {
    const b = this.boxes.get(model);
    if (!b) return null;
    const c = Math.cos(ry);
    const sn = Math.sin(ry);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const x of [b.min.x, b.max.x])
      for (const z of [b.min.z, b.max.z]) {
        const px = (x * sx * c + z * sz * sn) * s;
        const pz = (-x * sx * sn + z * sz * c) * s;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minZ = Math.min(minZ, pz);
        maxZ = Math.max(maxZ, pz);
      }
    return { minX, maxX, minZ, maxZ, height: (b.max.y - b.min.y) * s };
  }

  /**
   * Posición encajada: si el objeto mide un número entero de casillas, sus bordes caen en las líneas de la
   * rejilla; si no (un árbol, una lápida), queda centrado en su casilla.
   */
  private snapXZ(model: string, x: number, z: number, ry: number, s: number, sx = 1, sz = 1) {
    const f = this.footprint(model, ry, s, sx, sz);
    const axis = (p: number, min: number, max: number) => {
      const w = max - min;
      if (Math.round(w) >= 1 && Math.abs(w - Math.round(w)) < 0.1) return Math.round(p + min) - min;
      const mid = (min + max) / 2;
      return Math.floor(p + mid) + 0.5 - mid;
    };
    if (!f) return { x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5 };
    return { x: axis(x, f.minX, f.maxX), z: axis(z, f.minZ, f.maxZ) };
  }

  /**
   * Encaja un objeto en la rejilla: giro a 90°, posición en las casillas y, si es una pieza plana (losa,
   * camino, baldosa) y `fit`, tamaño de un número entero de casillas.
   */
  async snapObject(o: PlacedObject, fit: boolean): Promise<PlacedObject> {
    await this.loadModel(o.model);
    const ry = Math.round(o.ry / (Math.PI / 2)) * (Math.PI / 2);
    const s = o.s;
    let sx = o.sx ?? 1;
    let sz = o.sz ?? 1;
    const b = this.boxes.get(o.model);
    if (fit && b) {
      // pieza plana (losa, camino, baldosa): se estira para ocupar casillas enteras a lo ancho y a lo largo
      const w = (b.max.x - b.min.x) * s;
      const d = (b.max.z - b.min.z) * s;
      if (w > 0 && d > 0 && (b.max.y - b.min.y) * s < Math.max(w, d) * 0.25) {
        sx = Math.max(1, Math.round(w)) / w;
        sz = Math.max(1, Math.round(d)) / d;
      }
    }
    const p = this.snapXZ(o.model, o.x, o.z, ry, s, sx, sz);
    const lift = this.layout ? o.y - groundAt(this.layout, o.x, o.z) : 0;
    const y = this.layout ? groundAt(this.layout, p.x, p.z) + lift : o.y;
    const out: PlacedObject = { ...o, ry, s, x: p.x, y, z: p.z };
    delete out.sx;
    delete out.sz;
    if (Math.abs(sx - 1) > 1e-3) out.sx = sx;
    if (Math.abs(sz - 1) > 1e-3) out.sz = sz;
    return out;
  }

  // ------------------------------------------------------------------ ratón

  private ndc(e: { clientX: number; clientY: number }) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  /** Punto del suelo bajo el ratón (y la celda), o null si apunta fuera del mundo. */
  pickGround(e: { clientX: number; clientY: number }): { x: number; y: number; z: number; cx: number; cy: number } | null {
    if (!this.layout) return null;
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const hit = this.raycaster.intersectObjects([this.liquid, this.terrain], false)[0];
    if (!hit) return null;
    // si da en un lado del bloque, la celda es la de ese bloque (un poco hacia dentro)
    const n = hit.face?.normal ?? new THREE.Vector3(0, 1, 0);
    const p = hit.point.clone().addScaledVector(n, -0.01);
    const cx = Math.floor(p.x);
    const cy = Math.floor(p.z);
    if (cx < 0 || cy < 0 || cx >= this.layout.w || cy >= this.layout.h) return null;
    return { x: hit.point.x, y: groundAt(this.layout, hit.point.x, hit.point.z), z: hit.point.z, cx, cy };
  }

  private pickObject(e: PointerEvent): string | null {
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const hit = this.raycaster.intersectObjects(this.objectRoot.children, true)[0];
    let o: THREE.Object3D | null = hit?.object ?? null;
    while (o && !o.userData.id) o = o.parent;
    return o ? (o.userData.id as string) : null;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.down = { x: e.clientX, y: e.clientY, button: e.button };
    if (this.tool === "select" || this.tool === "stamp") return;
    const g = this.pickGround(e);
    if (!g) return;
    const c = this.strokeCell(g);
    this.stroking = true;
    this.lastCell = `${c.x},${c.y}`;
    this.events.onStroke(c.x, c.y, "start");
  };

  /** Celda del trazo; con la herramienta de casillas, la esquina de la casilla 2×2 más cercana al ratón. */
  private strokeCell(g: NonNullable<ReturnType<EditorScene["pickGround"]>>) {
    return this.tool === "tiles" && this.layout ? tileAnchor(this.layout, g.x, g.z) : { x: g.cx, y: g.cy };
  }

  private onPointerMove = (e: PointerEvent) => {
    if (this.tool === "select") return;
    const g = this.pickGround(e);
    this.updateBrush(g);
    if (!this.stroking || !g) return;
    const c = this.strokeCell(g);
    const key = `${c.x},${c.y}`;
    if (key === this.lastCell) return;
    this.lastCell = key;
    this.events.onStroke(c.x, c.y, "move");
  };

  private onPointerUp = (e: PointerEvent) => {
    const down = this.down;
    this.down = null;
    if (this.stroking) {
      this.stroking = false;
      this.events.onStrokeEnd();
      return;
    }
    if (!down || e.target !== this.renderer.domElement) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5;
    if (moved) return;
    if (this.tool === "stamp") {
      const g = this.pickGround(e);
      if (g) this.events.onStamp(g.x, g.y, g.z);
      return;
    }
    if (this.tool === "select" && !this.gizmo.dragging && this.gizmo.axis === null) this.select(this.pickObject(e));
  };

  private updateBrush(g: ReturnType<EditorScene["pickGround"]>) {
    const l = this.layout;
    if (!l || !g || this.tool === "select") {
      this.brush.visible = false;
      return;
    }
    if (this.tool === "tiles") {
      const a = tileAnchor(l, g.x, g.z);
      let top = 0;
      for (let dy = 0; dy < TILE_SIZE; dy++) for (let dx = 0; dx < TILE_SIZE; dx++) top = Math.max(top, l.height[(a.y + dy) * l.w + a.x + dx] * LEVEL);
      this.brush.scale.set(TILE_SIZE, 1, TILE_SIZE);
      this.brush.position.set(a.x + TILE_SIZE / 2, top + 0.03, a.y + TILE_SIZE / 2);
      this.brush.visible = true;
      return;
    }
    const size = this.tool === "stamp" ? 1 : this.brushSize;
    const cells = brushCells(l, g.cx, g.cy, size);
    let top = 0;
    for (const i of cells) top = Math.max(top, l.height[i] * LEVEL);
    const r0 = -Math.floor((size - 1) / 2);
    this.brush.scale.set(size, 1, size);
    this.brush.position.set(g.cx + r0 + size / 2, top + 0.03, g.cy + r0 + size / 2);
    if (this.tool === "stamp") this.brush.position.set(g.x, g.y + 0.03, g.z);
    this.brush.visible = true;
  }

  // ------------------------------------------------------------------ gizmo

  private onGizmoChange() {
    const g = this.selectedGroup();
    if (!g || !this.layout) return;
    const mode = this.gizmo.getMode();
    if (mode === "translate") {
      if (this.snap) {
        const p = this.snapXZ(g.userData.model, g.position.x, g.position.z, g.rotation.y, g.scale.y, g.userData.sx, g.userData.sz);
        g.position.x = p.x;
        g.position.z = p.z;
      }
      g.position.y = groundAt(this.layout, g.position.x, g.position.z) + this.dragOffset;
    }
    if (mode === "scale") {
      // tamaño uniforme (respetando el estiramiento de la losa): manda el eje que más cambió
      const { sx, sz } = g.userData;
      const prev = g.userData.lastScale ?? 1;
      const v = [g.scale.x / sx, g.scale.y, g.scale.z / sz].reduce((a, b) => (Math.abs(b - prev) > Math.abs(a - prev) ? b : a), prev);
      const k = Math.max(0.05, v);
      g.scale.set(k * sx, k, k * sz);
      g.userData.lastScale = k;
    }
    this.emitEdited(false);
  }

  private emitEdited(final: boolean) {
    const g = this.selectedGroup();
    if (!g) return;
    g.userData.lastScale = g.scale.y;
    const { sx, sz } = g.userData;
    this.events.onObjectEdited(
      {
        id: g.userData.id,
        model: g.userData.model,
        x: g.position.x,
        y: g.position.y,
        z: g.position.z,
        rx: g.rotation.x,
        ry: g.rotation.y,
        rz: g.rotation.z,
        s: g.scale.y,
        ...(sx !== 1 && { sx }),
        ...(sz !== 1 && { sz }),
      },
      final,
    );
  }

  // ------------------------------------------------------------------ casillas del juego

  /** Losa de cada casilla: su color, el icono pintado en el suelo y el número. */
  private buildTiles(l: BoardLayout) {
    for (const m of this.tileRoot.children as THREE.Mesh[]) m.geometry.dispose();
    this.tileRoot.clear();
    const used = new Set<string>();
    // si el tipo de letra elegido aún no se descargó, se redibuja en cuanto llegue
    if (l.numbers.show && !this.fontsReady.has(l.numbers.font))
      void this.needFont(l.numbers.font).then(() => {
        if (this.layout?.numbers.font !== l.numbers.font) return;
        this.dropTileTextures();
        this.buildTiles(this.layout);
      });
    // losa con todas las esquinas y los cantos redondeados (nada de ángulos duros)
    const geo = new RoundedBoxGeometry(TILE_SIZE - 0.16, 0.3, TILE_SIZE - 0.16, 4, 0.14);
    l.tiles.forEach((t, k) => {
      const n = k + 1;
      const look = lookOf(l, tileTypeOf(n));
      const key = `${n}|${look.color}|${look.icon}|${look.kind}|${look.ink}|${JSON.stringify(l.numbers)}`;
      used.add(key);
      let tex = this.tileTextures.get(key);
      if (!tex) {
        tex = this.tileTexture(n, look.color, look.icon, look.kind, look.ink, l.numbers);
        this.tileTextures.set(key, tex);
      }
      const sideColor = look.kind === "road" ? new THREE.Color(ROAD.edge) : new THREE.Color(look.color).multiplyScalar(0.55);
      const side = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.85 });
      const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
      // orden de caras de BoxGeometry: +x, -x, +y (arriba), -y, +z, -z
      const mesh = new THREE.Mesh(geo, [side, side, top, side, side, side]);
      mesh.position.set(t.x + TILE_SIZE / 2, this.tileTop(l, t) - 0.03, t.y + TILE_SIZE / 2); // la mitad queda enterrada
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.tileRoot.add(mesh);
    });
    for (const [key, tex] of this.tileTextures)
      if (!used.has(key)) {
        tex.dispose();
        this.tileTextures.delete(key);
      }
  }

  /**
   * Cara de arriba de la losa. Vista desde la TV la losa es un rombo, así que el icono va girado 45° para salir
   * derecho en pantalla, y el número va en la punta de delante.
   */
  private tileTexture(n: number, color: string, icon: string, kind: TileKind, paint: string, numbers: NumberStyle): THREE.CanvasTexture {
    const S = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext("2d")!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const road = kind === "road";
    const tint = new THREE.Color(color);
    if (road) {
      ctx.fillStyle = ROAD.asphalt;
      ctx.fillRect(0, 0, S, S);
      for (let k = 0; k < 900; k++) {
        ctx.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.035)";
        ctx.fillRect(Math.random() * S, Math.random() * S, 3, 3);
      }
    } else {
      // color liso con un degradado muy suave, sin bordes ni marcos
      const grad = ctx.createLinearGradient(0, 0, S, S);
      grad.addColorStop(0, "#" + tint.clone().lerp(new THREE.Color("#ffffff"), 0.1).getHexString());
      grad.addColorStop(1, "#" + tint.clone().multiplyScalar(0.92).getHexString());
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, S, S);
    }
    // número: con el tipo de letra, tamaño y sitio elegidos, girado para leerse derecho desde la cámara
    if (numbers.show) {
      const m = 40 + numbers.size * 0.5;
      const at: Record<NumberStyle["pos"], [number, number]> = {
        front: [S - m, S - m],
        back: [m, m],
        left: [m, S - m],
        right: [S - m, m],
        center: [S / 2, S / 2],
      };
      ctx.save();
      ctx.translate(...at[numbers.pos]);
      ctx.rotate(-Math.PI / 4);
      ctx.font = `${numbers.size}px ${this.fontFamily(numbers.font)}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = paint;
      ctx.globalAlpha = road ? 0.85 : 0.95;
      ctx.fillText(String(n), 0, 0);
      ctx.restore();
    }

    /** Icono girado 45° (la losa se ve como un rombo), en una capa aparte para poder recortarlo y teñirlo. */
    const drawOnLayer = (draw: (c: CanvasRenderingContext2D) => void, recolor: boolean) => {
      const layer = document.createElement("canvas");
      layer.width = layer.height = S;
      const lc = layer.getContext("2d")!;
      lc.fillStyle = paint;
      // con el número en el centro, el icono se hace más chico y se corre hacia atrás para no pisarse
      const off = numbers.show && numbers.pos === "center" ? 118 : 24;
      lc.translate(S / 2 - off, S / 2 - off);
      lc.rotate(-Math.PI / 4);
      draw(lc);
      if (recolor) {
        lc.setTransform(1, 0, 0, 1, 0, 0);
        lc.globalCompositeOperation = "source-in";
        lc.fillRect(0, 0, S, S);
      }
      ctx.globalAlpha = road ? 0.9 : 0.96;
      ctx.drawImage(layer, 0, 0);
      ctx.globalAlpha = 1;
    };
    const name = builtinIcon(icon);
    const iconSize = numbers.show && numbers.pos === "center" ? 170 : 270;
    if (name) drawOnLayer((c) => drawIcon(c, name, iconSize), false);
    else if (icon.startsWith("data:")) {
      const img = new Image();
      const done = new Promise<void>((resolve) => {
        img.onload = () => {
          drawOnLayer((c) => c.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize), road);
          tex.needsUpdate = true;
          resolve();
        };
        img.onerror = () => resolve();
      });
      this.pendingIcons.add(done);
      done.then(() => this.pendingIcons.delete(done));
      img.src = icon;
    } else
      drawOnLayer((c) => {
        c.font = "230px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(icon, 0, 14);
      }, road);
    return tex;
  }

  /** Nombre CSS del tipo de letra (la variable la define next/font en <body> o en el contenedor del editor). */
  private fontFamily(id: NumberFont) {
    const f = NUMBER_FONTS[id];
    const v = getComputedStyle(this.container).getPropertyValue(f.cssVar).trim();
    return v ? `${v}, ${f.fallback}` : f.fallback;
  }

  /** Pide la descarga del tipo de letra y avisa cuando está listo (si falla, se sigue con la de respaldo). */
  private needFont(id: NumberFont): Promise<void> {
    if (this.fontsReady.has(id)) return Promise.resolve();
    return document.fonts
      .load(`80px ${this.fontFamily(id)}`)
      .catch(() => undefined)
      .then(() => void this.fontsReady.add(id));
  }

  private dropTileTextures() {
    for (const t of this.tileTextures.values()) t.dispose();
    this.tileTextures.clear();
  }

  /** Altura de la cara de arriba del terreno bajo una casilla (la celda más alta de las que pisa). */
  private tileTop(l: BoardLayout, t: { x: number; y: number }) {
    let top = 0;
    for (let dy = 0; dy < TILE_SIZE; dy++) for (let dx = 0; dx < TILE_SIZE; dx++) top = Math.max(top, l.height[(t.y + dy) * l.w + t.x + dx] * LEVEL);
    return top;
  }

  // ------------------------------------------------------------------ foto para la TV

  /**
   * Renderiza el tablero entero con la cámara de la TV (isométrica fija, sin rejilla ni ayudas) y calcula dónde
   * cae cada casilla en la imagen, para poner encima las fichas.
   */
  async renderForTV(maxWidth = 2400): Promise<{ image: string; width: number; height: number; tiles: { x: number; y: number }[]; cell: number; bg: string }> {
    const l = this.layout;
    if (!l) throw new Error("No hay diseño");
    await Promise.all([...this.models.values(), this.needFont(l.numbers.font)]);
    if (l.numbers.show) {
      this.dropTileTextures();
      this.buildTiles(l);
    }
    await Promise.all([...this.pendingIcons]);

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 1000);
    const center = new THREE.Vector3(l.w / 2, 0, l.h / 2);
    const dir = new THREE.Vector3(1, Math.tan(Math.PI / 6) * Math.SQRT2, 1).normalize();
    cam.position.copy(center).addScaledVector(dir, CAM_DIST);
    cam.lookAt(center);
    cam.updateMatrixWorld();
    // encuadre: la superficie del mundo; alrededor se ve el terreno que sigue, nunca el vacío
    let maxTop = 0;
    for (const h of l.height) maxTop = Math.max(maxTop, h * LEVEL);
    // (con margen por arriba para las fichas que están de pie en las casillas del fondo)
    const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(l.w, maxTop + 2.5, l.h));
    const inv = cam.matrixWorldInverse;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const p = new THREE.Vector3(x, y, z).applyMatrix4(inv);
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
    // proporción de la TV (16:9): lo que falta se rellena con el terreno de alrededor, así nunca se ve el cielo
    const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2];
    let [hw, hh] = [(maxX - minX) / 2, (maxY - minY) / 2];
    if (hw / hh > 16 / 9) hh = (hw * 9) / 16;
    else hw = (hh * 16) / 9;
    Object.assign(cam, { left: cx - hw, right: cx + hw, top: cy + hh, bottom: cy - hh });
    cam.updateProjectionMatrix();
    const width = maxWidth;
    const height = Math.round((width * 9) / 16);

    const hidden = [this.grid, this.bounds, this.brush, this.gizmo.getHelper()].filter((o) => o.visible);
    for (const o of hidden) o.visible = false;
    const ratio = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.render(this.scene, cam);
    let image = this.renderer.domElement.toDataURL("image/webp", 0.85);
    // el servidor acepta hasta ~4 MB: si pesa más, se baja la calidad
    for (const q of [0.75, 0.6]) if (image.length > 4_000_000) image = this.renderer.domElement.toDataURL("image/webp", q);
    this.renderer.setPixelRatio(ratio);
    for (const o of hidden) o.visible = true;
    this.resize();

    const toPx = (v: THREE.Vector3) => {
      const p = v.clone().project(cam);
      return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height };
    };
    const tiles = l.tiles.map((t) => toPx(new THREE.Vector3(t.x + TILE_SIZE / 2, this.tileTop(l, t) + 0.14, t.y + TILE_SIZE / 2)));
    // ancho en pantalla del rombo de una casilla (las fichas se escalan con él)
    const cell = Math.abs(toPx(new THREE.Vector3(TILE_SIZE, 0, 0)).x - toPx(new THREE.Vector3(0, 0, TILE_SIZE)).x);
    const bg = "#" + (this.scene.background as THREE.Color).getHexString();
    return { image, width, height, tiles, cell, bg };
  }
}
