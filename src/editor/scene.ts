// Escena 3D del editor del tablero (Three.js en el navegador del admin). El diseño (BoardLayout) vive en
// React; esta clase solo lo dibuja (setLayout), recoge el ratón y avisa con callbacks.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { builtinIcon, drawIcon } from "./icons";
import { viewerQuality, type Quality } from "./quality";
import { findLamp, type Lamp } from "./lamp";
import { lightOf, NUMBER_FONTS, parseTvView, tvDirection, type NumberFont, type NumberStyle, type TvView } from "./layout";
import { brushCells, GROUNDS, groundAt, LEVEL, LIQUIDS, lookOf, TILE_SIZE, tileAnchor, tileTypeOf, type BoardLayout, type TileKind, type LightId, type PlacedObject } from "./layout";

export type Tool = "select" | "paint" | "raise" | "lower" | "flatten" | "stamp" | "tiles";
export type GizmoMode = "translate" | "rotate" | "scale";

export type SceneEvents = {
  /** Trazo de pincel sobre una celda (phase "start" al apretar, "move" al pasar a otra celda). */
  onStroke: (x: number, y: number, phase: "start" | "move") => void;
  onStrokeEnd: () => void;
  /** La selección cambió: ids de los objetos elegidos (vacío = ninguno). */
  onSelect: (ids: string[]) => void;
  /** Uno o varios objetos cambiaron (gizmo, flechas de giro); `final` al soltar el ratón. */
  onObjectsEdited: (list: PlacedObject[], final: boolean) => void;
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
  /** Neblina baja alrededor de la zona editable: esconde el terreno de fuera, que no se puede construir. */
  private mistRoot = new THREE.Group();
  private mistTexture: THREE.CanvasTexture | null = null;
  private brush: THREE.LineSegments;
  private objectRoot = new THREE.Group();
  private tileRoot = new THREE.Group();
  /** Tipos de letra de los números que ya se descargaron (hasta entonces se dibuja con la de respaldo). */
  private fontsReady = new Set<NumberFont>();
  private tileTextures = new Map<string, THREE.CanvasTexture>();
  private glowTexture: THREE.CanvasTexture | null = null;
  /** Modelos cargados (sin instanciar) y su análisis de "qué parte es luz", que se hace al primer uso. */
  private baseScenes = new Map<string, THREE.Object3D>();
  private lamps = new Map<string, Lamp>();
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
  private selectedIds: string[] = [];
  private dragOffset = 0;
  /** Con varios objetos elegidos el gizmo mueve este pivote y los objetos lo siguen. */
  private pivot = new THREE.Object3D();
  private multiStart: { center: THREE.Vector3; entries: { id: string; pos: THREE.Vector3; ry: number; lift: number }[] } | null = null;
  private mode: GizmoMode = "translate";
  /** Flechas de giro rápido (HTML, las pone el editor): solo con Ajustar y la herramienta Girar. */
  private handleEl: HTMLElement | null = null;
  private handleOn = false;
  private marqueeEl: HTMLDivElement;
  private marquee: { x0: number; y0: number; active: boolean } | null = null;
  private snap = true;

  /** Ruta de cada modelo del catálogo (id -> url del .glb). */
  modelUrl: (id: string) => string | undefined = () => undefined;

  /**
   * Modo visor (la TV juega con el tablero en 3D en vivo, como un videojuego): sin herramientas de edición ni ayudas,
   * con la cámara de `tvView` siguiendo el punto que se le pida (`lookAt`) y `onFrame` para animar lo que se añada.
   */
  private viewer: boolean;
  /** Visor: escala de la resolución interna (1 = completa; baja sola si el aparato no llega). */
  resScale = 1;
  /** Visor: calidad según el aparato (PC, móvil o Smart TV): luces, fotogramas, resolución y sombras. */
  quality: Quality | null = null;
  private look = new THREE.Vector3();
  private lookGoal = new THREE.Vector3();
  /** Se llama en cada fotograma del visor con los segundos desde el anterior (para animar las fichas). */
  onFrame: ((dt: number) => void) | null = null;
  /** Visor: después de dibujar, con la cámara ya colocada (para lo que se pone en HTML encima). */
  onAfterFrame: (() => void) | null = null;

  constructor(
    private container: HTMLElement,
    private events: SceneEvents,
    opts: { viewer?: boolean } = {},
  ) {
    this.viewer = !!opts.viewer;
    if (this.viewer) this.quality = viewerQuality();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !this.viewer, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    // en la TV, sombras más baratas de leer (están congeladas, pero cada píxel las consulta en cada fotograma)
    this.renderer.shadowMap.type = this.viewer && this.quality!.level !== "alta" ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.scene.add(this.hemi, this.sun, this.sun.target, this.objectRoot, this.grid, this.bounds, this.tileRoot, this.mistRoot);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.quality?.shadowSize ?? 4096, this.quality?.shadowSize ?? 4096);
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
    this.scene.add(this.pivot);
    this.gizmo.addEventListener("dragging-changed", (e) => {
      this.orbit.enabled = !e.value;
      if (!this.layout) return;
      if (this.selectedIds.length > 1) {
        if (e.value) this.startMulti();
        else this.finishMulti();
        return;
      }
      const g = this.singleGroup();
      if (e.value && g) this.dragOffset = g.position.y - groundAt(this.layout, g.position.x, g.position.z);
      if (!e.value) {
        // al soltar tras girar o escalar, la huella cambió: se vuelve a encajar en la rejilla
        if (g && this.snap) {
          const p = this.snapXZ(g.userData.model, g.position.x, g.position.z, g.rotation.y, g.scale.y, g.userData.sx, g.userData.sz);
          g.position.set(p.x, groundAt(this.layout, p.x, p.z) + (g.position.y - groundAt(this.layout, g.position.x, g.position.z)), p.z);
        }
        this.emitEdited(true);
      }
    });
    this.gizmo.addEventListener("objectChange", () => (this.selectedIds.length > 1 ? this.onMultiChange() : this.onGizmoChange()));
    // recuadro de selección (arrastrar en vacío con la herramienta Seleccionar)
    this.marqueeEl = document.createElement("div");
    Object.assign(this.marqueeEl.style, { position: "absolute", display: "none", border: "1px dashed #ffd23f", background: "rgba(255,210,63,0.12)", pointerEvents: "none", zIndex: "5" });
    container.appendChild(this.marqueeEl);
    this.setGizmoMode("translate");

    const el = this.renderer.domElement;
    if (this.viewer) {
      this.orbit.enabled = false;
      for (const o of [this.grid, this.bounds, this.brush, this.gizmo.getHelper()]) o.visible = false;
      this.resizeObs = new ResizeObserver(() => this.resize());
      this.resizeObs.observe(container);
      this.resize();
      let last = performance.now();
      let windowStart = last;
      let windowFrames = 0;
      let good = 0;
      // `?debug` en la dirección: rótulo con los fotogramas por segundo y la resolución (para ajustar según la TV)
      let debugEl: HTMLDivElement | null = null;
      if (new URLSearchParams(location.search).has("debug")) {
        debugEl = document.createElement("div");
        Object.assign(debugEl.style, { position: "absolute", left: "8px", bottom: "8px", padding: "4px 8px", background: "rgba(0,0,0,.7)", color: "#0f0", font: "14px monospace", zIndex: "9", pointerEvents: "none" });
        container.appendChild(debugEl);
      }
      const viewLoop = (now: number) => {
        this.frame = requestAnimationFrame(viewLoop);
        // como en las consolas: 30 fotogramas por segundo fijos (la mitad de trabajo que a 60 y se ve igual de fluido
        // en un tablero), y deja tiempo libre para el resto de la página (consultar la mesa, el dado, los títulos)
        if (now - last < 1000 / this.quality!.fps - 4) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        // resolución dinámica: si no llega a ~24 fps baja la resolución interna (hasta 0,75: más abajo se ve pixelado y no gana
        // casi nada); si va sobrado la sube
        windowFrames++;
        if (now - windowStart > 1000) {
          const fps = (windowFrames * 1000) / (now - windowStart);
          windowStart = now;
          windowFrames = 0;
          if (debugEl) {
            const i = this.renderer.info.render;
            debugEl.textContent = `${this.quality!.level} (${this.quality!.why}) · ${fps.toFixed(0)} fps · res ${(this.resScale * 100).toFixed(0)}% · ${this.renderer.domElement.width}×${this.renderer.domElement.height} · ${i.calls} dibujos · ${(i.triangles / 1000).toFixed(0)}k tri`;
          }
          if (fps < this.quality!.fps * 0.8 && this.resScale > 0.75) {
            this.resScale = Math.max(0.75, this.resScale - 0.1);
            good = 0;
            this.resize();
          } else if (fps >= this.quality!.fps * 0.93 && this.resScale < 1 && ++good >= 5) {
            this.resScale = Math.min(1, this.resScale + 0.1);
            good = 0;
            this.resize();
          }
        }
        this.onFrame?.(dt);
        // la cámara sigue el punto pedido con suavidad (como en Mario Party), sin saltos
        this.look.lerp(this.lookGoal, 1 - Math.exp(-dt * 2.6));
        this.placeViewerCamera();
        this.updateViewerLights(dt);
        this.renderer.render(this.scene, this.camera);
        // lo que va en HTML encima (los nombres) se coloca con la cámara de ESTE fotograma: antes iba con la del anterior y,
        // mientras la cámara se desplazaba, el nombre se quedaba atrás del personaje y luego volvía
        this.onAfterFrame?.();
      };
      this.frame = requestAnimationFrame(viewLoop);
      return;
    }
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
      this.updateHandle();
    };
    loop();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObs.disconnect();
    window.removeEventListener("pointerup", this.onPointerUp);
    this.onFrame = null;
    this.onAfterFrame = null;
    this.gizmo.dispose();
    this.orbit.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.marqueeEl.remove();
  }

  // ------------------------------------------------------------------ cámara

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    if (this.viewer) {
      // TV: como mucho 1920 píxeles reales de ancho (una TV 4K escala sola; dibujar 3840 era 4 veces más trabajo), por la
      // resolución dinámica
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality!.maxWidth / w) * this.resScale);
    }
    this.renderer.setSize(w, h);
    if (this.viewer) {
      // visor: caben tvView.tiles casillas a lo ancho de la pantalla, a la resolución real de la pantalla
      const tiles = this.layout?.tvView.tiles ?? 6;
      const vw = TILE_SIZE * Math.SQRT2 * tiles;
      Object.assign(this.camera, { left: -vw / 2, right: vw / 2, top: (vw * h) / w / 2, bottom: -(vw * h) / w / 2, zoom: 1 });
      this.camera.updateProjectionMatrix();
      return;
    }
    const view = this.layout ? (this.layout.w + this.layout.h) * 0.42 : 20;
    const aspect = w / h;
    Object.assign(this.camera, { left: (-view * aspect) / 2, right: (view * aspect) / 2, top: view / 2, bottom: -view / 2 });
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ visor (la TV)

  private placeViewerCamera() {
    if (!this.layout) return;
    const dir = new THREE.Vector3(...tvDirection(this.layout.tvView));
    this.camera.position.copy(this.look).addScaledVector(dir, CAM_DIST);
    this.camera.lookAt(this.look);
  }

  /** Visor: hacia dónde mira la cámara (se acerca con suavidad; con `instant`, de golpe). */
  lookAt(p: THREE.Vector3, instant = false) {
    this.lookGoal.copy(p);
    if (instant) this.look.copy(p);
  }

  /** Centro de la cara de arriba de la casilla n (1..62), donde se apoyan las fichas. */
  tileCenter(n: number): THREE.Vector3 | null {
    const l = this.layout;
    const t = l?.tiles[n - 1];
    if (!l || !t) return null;
    return new THREE.Vector3(t.x + TILE_SIZE / 2, this.tileTop(l, t) + 0.14, t.y + TILE_SIZE / 2);
  }

  /** Añade algo a la escena (las fichas del visor). */
  add(o: THREE.Object3D) {
    this.scene.add(o);
  }

  /** Punto del mundo en píxeles CSS del contenedor (para los nombres encima de las fichas). */
  toScreen(p: THREE.Vector3) {
    const v = p.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * this.container.clientWidth, y: ((1 - v.y) / 2) * this.container.clientHeight, visible: v.z < 1 };
  }

  /** Dirección de la cámara de la TV vista desde arriba (para colocar varias fichas en fila en pantalla). */
  screenRight() {
    const az = ((this.layout?.tvView.az ?? 45) * Math.PI) / 180;
    return new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
  }

  /**
   * Espera a que estén todos los modelos, tipos de letra e iconos; en el visor congela las sombras (el escenario no se
   * mueve: se calculan una vez y no en cada fotograma, que es lo caro).
   */
  async ready() {
    const l = this.layout;
    if (!l) return;
    await Promise.all([...this.models.values(), this.needFont(l.numbers.font)]);
    if (l.numbers.show) {
      this.dropTileTextures();
      this.buildTiles(l);
    }
    await Promise.all([...this.pendingIcons]);
    await new Promise((ok) => requestAnimationFrame(ok));
    if (this.viewer) {
      this.collectViewerLamps();
      this.mergeStatic();
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = true;
      await this.precompile();
    }
  }

  /**
   * Visor: compila los shaders de todo lo que hay en escena sin bloquear la página (si el navegador sabe hacerlo en paralelo). Se llama
   * otra vez después de añadir las fichas: si no, el primer dibujo de los zombis (otro tipo de material, con esqueleto) congela la TV un
   * momento justo al aparecer el tablero.
   */
  async precompile() {
    try {
      this.placeViewerCamera();
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {}
  }

  // --- luces de los faroles en la TV: pocas luces de verdad que siguen a los faroles más cercanos a la cámara ---
  private viewerLamps: { pos: THREE.Vector3; color: THREE.Color; intensity: number; distance: number }[] = [];
  private lampSlots: { light: THREE.SpotLight; lamp: number; k: number }[] = [];

  /**
   * Cada foco de verdad encarece cada píxel de toda la escena (con 9 faroles, 9 veces), así que en la TV hay solo `quality.lights`
   * focos y cada fotograma se reparten entre los faroles más cercanos a lo que enseña la cámara (la cantidad de luces no cambia, así
   * no se recompilan los shaders). Se apagan y encienden con suavidad al cambiar de farol.
   */
  private collectViewerLamps() {
    this.objectRoot.updateMatrixWorld(true);
    for (const g of this.objectRoot.children) {
      const rig = g.userData.rig as THREE.Group | undefined;
      if (!rig) continue;
      for (const lampGroup of rig.children as THREE.Group[]) {
        const light = lampGroup.children[0] as THREE.SpotLight;
        this.viewerLamps.push({ pos: lampGroup.getWorldPosition(new THREE.Vector3()), color: light.color.clone(), intensity: light.intensity, distance: light.distance });
      }
    }
    const n = Math.min(this.quality!.lights, this.viewerLamps.length);
    for (let i = 0; i < n; i++) {
      const light = new THREE.SpotLight();
      light.angle = Math.PI * 0.32;
      light.penumbra = 0.7;
      light.decay = 1.5;
      light.intensity = 0;
      light.castShadow = false;
      this.scene.add(light, light.target);
      this.lampSlots.push({ light, lamp: -1, k: 0 });
    }
  }

  private updateViewerLights(dt: number) {
    if (!this.lampSlots.length) return;
    // los faroles más cercanos al punto que mira la cámara (por orden, sin repetir)
    const order = this.viewerLamps.map((l, i) => ({ i, d: l.pos.distanceToSquared(this.look) })).sort((a, b) => a.d - b.d).slice(0, this.lampSlots.length).map((o) => o.i);
    const taken = new Set(order);
    const free = this.lampSlots.filter((s) => s.lamp < 0 || !taken.has(s.lamp));
    for (const lamp of order) {
      if (this.lampSlots.some((s) => s.lamp === lamp)) continue;
      const slot = free.find((s) => s.k < 0.02); // un hueco que ya se apagó
      if (slot) {
        slot.lamp = lamp;
        free.splice(free.indexOf(slot), 1);
      }
    }
    for (const s of this.lampSlots) {
      const on = s.lamp >= 0 && taken.has(s.lamp);
      s.k = Math.max(0, Math.min(1, s.k + (on ? 1 : -1) * dt * 2.2));
      if (s.lamp < 0) continue;
      const l = this.viewerLamps[s.lamp];
      s.light.position.copy(l.pos);
      s.light.target.position.set(l.pos.x, l.pos.y - 1, l.pos.z);
      s.light.target.updateMatrixWorld();
      s.light.color.copy(l.color);
      s.light.distance = l.distance;
      s.light.intensity = l.intensity * s.k;
    }
  }

  /**
   * Visor: junta los objetos del escenario (no se mueven) en pocas mallas, una por material y por trozo del mundo, para
   * que la TV haga unas decenas de dibujos por fotograma en vez de cientos (el procesador de una TV es lento). Por trozos
   * de 24 celdas para que lo que queda fuera de la pantalla no se dibuje.
   */
  private mergeStatic() {
    const buckets = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; geos: THREE.BufferGeometry[] }>();
    const drop: THREE.Mesh[] = [];
    const center = new THREE.Vector3();
    // Cada .glb trae su propio material aunque todos los del mismo kit usan la misma hoja de colores: se tratan como uno
    // solo (mismo kit, mismo nombre, mismas medidas de textura y mismos ajustes) para juntar mucho más.
    const same = new Map<string, THREE.Material>();
    const canonical = (material: THREE.Material, kit: string | undefined) => {
      const m = material as THREE.MeshStandardMaterial & THREE.MeshBasicMaterial;
      if (m.emissiveMap) return material; // las lámparas encendidas, aparte
      let key: string;
      if (m.isMeshBasicMaterial && m.blending === THREE.AdditiveBlending) key = `pool|${m.color.getHex()}`; // charcos de luz
      else if (!m.isMeshStandardMaterial || (!kit && m.map)) return material; // la cara de cada casilla tiene su dibujo
      else {
        const img = m.map?.image as { width?: number; height?: number } | undefined;
        key = [kit ?? "-", m.name, img?.width, img?.height, m.color.getHex(), m.roughness, m.metalness, m.vertexColors, m.side, m.flatShading, m.transparent, m.opacity].join("|");
      }
      const hit = same.get(key);
      if (hit) return hit;
      same.set(key, material);
      return material;
    };
    const put = (g: THREE.BufferGeometry, material: THREE.Material, mesh: THREE.Mesh) => {
      g.applyMatrix4(mesh.matrixWorld);
      g.computeBoundingBox();
      g.boundingBox!.getCenter(center);
      const attrs = Object.keys(g.attributes).sort().join(",");
      const key = `${material.uuid}|${attrs}|${mesh.castShadow}|${mesh.receiveShadow}|${Math.floor(center.x / 24)},${Math.floor(center.z / 24)}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { material, cast: mesh.castShadow, receive: mesh.receiveShadow, geos: [] }));
      b.geos.push(g);
    };
    for (const root of [this.objectRoot, this.tileRoot]) {
      root.updateMatrixWorld(true);
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || (o as THREE.SkinnedMesh).isSkinnedMesh || !mesh.visible) return;
        const geo = mesh.geometry;
        if (geo.morphAttributes.position) return;
        let owner: THREE.Object3D | null = o;
        while (owner && owner.parent !== this.objectRoot) owner = owner.parent;
        const kit = (owner?.userData.model as string | undefined)?.split("/")[0];
        if (Array.isArray(mesh.material)) {
          // casillas: los lados (mismo material en todas las del mismo color) se juntan; la cara de arriba, una por casilla
          const flat = geo.index ? geo.toNonIndexed() : geo;
          for (const grp of flat.groups) {
            const part = new THREE.BufferGeometry();
            for (const [name, attr] of Object.entries(flat.attributes)) {
              const a = attr as THREE.BufferAttribute;
              part.setAttribute(name, new THREE.BufferAttribute(a.array.slice(grp.start * a.itemSize, (grp.start + grp.count) * a.itemSize), a.itemSize, a.normalized));
            }
            put(part, canonical(mesh.material[grp.materialIndex ?? 0], kit), mesh);
          }
          if (flat !== geo) flat.dispose();
        } else {
          const material = canonical(mesh.material as THREE.Material, kit);
          if (material.transparent && material.blending !== THREE.AdditiveBlending) return; // niebla, agua: aparte
          if (geo.groups.length > 1) return;
          put(geo.index ? geo.toNonIndexed() : geo.clone(), material, mesh);
        }
        drop.push(mesh);
      });
    }
    const merged = new THREE.Group();
    for (const b of buckets.values()) {
      const geo = mergeGeometries(b.geos, false);
      for (const g of b.geos) g.dispose();
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, b.material);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      mesh.matrixAutoUpdate = false;
      merged.add(mesh);
    }
    for (const m of drop) m.removeFromParent();
    this.scene.add(merged);
  }

  /** Vista de la TV (`tvView` del diseño), centrada en el mundo: con `close`, acercada como la TV; si no, todo el mundo. */
  resetView(close = false) {
    if (!this.layout) return;
    if (this.viewer) return this.resize(); // en el visor la cámara la lleva lookAt
    const c = new THREE.Vector3(this.layout.w / 2, 0, this.layout.h / 2);
    const dir = new THREE.Vector3(...tvDirection(this.layout.tvView));
    this.camera.position.copy(c).addScaledVector(dir, CAM_DIST);
    this.orbit.target.copy(c);
    this.resize();
    // acercamiento: que quepan tvView.tiles casillas a lo ancho, como en la TV cuando sigue a una ficha
    const visible = this.camera.right - this.camera.left;
    this.camera.zoom = !close ? 1 : Math.min(this.orbit.maxZoom, Math.max(this.orbit.minZoom, visible / (TILE_SIZE * Math.SQRT2 * this.layout.tvView.tiles)));
    this.camera.updateProjectionMatrix();
    this.orbit.update();
  }

  /** La vista actual del editor como vista de la TV: el mismo ángulo y las mismas casillas a lo ancho. */
  currentView(): TvView {
    const d = this.camera.position.clone().sub(this.orbit.target).normalize();
    const az = (Math.atan2(d.x, d.z) * 180) / Math.PI;
    const el = (Math.asin(Math.min(1, Math.max(-1, d.y))) * 180) / Math.PI;
    const visible = (this.camera.right - this.camera.left) / this.camera.zoom;
    return parseTvView({ az, el, tiles: visible / (TILE_SIZE * Math.SQRT2) });
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
    this.mode = mode;
    // con varios objetos no hay tamaño: se mueven y se giran en bloque
    const effective: GizmoMode = this.selectedIds.length > 1 && mode === "scale" ? "translate" : mode;
    this.gizmo.setMode(effective);
    // con Ajustar, mover encaja en la rejilla (onGizmoChange)
    this.gizmo.setTranslationSnap(null);
    this.gizmo.setRotationSnap(null);
    this.gizmo.setScaleSnap(this.snap ? 0.1 : null);
    // Mover: solo sobre el suelo (la altura se ajusta sola). Girar: solo alrededor del eje vertical.
    this.gizmo.showX = effective !== "rotate";
    this.gizmo.showZ = effective !== "rotate";
    this.gizmo.showY = effective !== "translate";
    // Girar con Ajustar: no hay anillo, hay flechas de 90° (como en Los Sims). Sin Ajustar: anillo libre.
    this.handleOn = effective === "rotate" && this.snap && this.selectedIds.length > 0;
    this.gizmo.enabled = !this.handleOn;
    this.gizmo.getHelper().visible = !this.handleOn && this.selectedIds.length > 0;
  }

  setGrid(on: boolean) {
    this.grid.visible = on;
  }

  /** Elemento HTML con las flechas de giro (el editor lo coloca y la escena lo mueve sobre la selección). */
  setRotateHandle(el: HTMLElement | null) {
    this.handleEl = el;
  }

  /** Está activo el giro por flechas (Ajustar + Girar): el editor muestra o no el texto de ayuda. */
  get usesRotateArrows() {
    return this.handleOn;
  }

  select(id: string | null, notify = true) {
    this.setSelection(id ? [id] : [], notify);
  }

  selectAll() {
    this.setSelection([...this.objects.keys()]);
  }

  setSelection(ids: string[], notify = true) {
    this.selectedIds = [...new Set(ids)].filter((id) => this.objects.has(id));
    this.attachGizmo();
    if (notify) this.events.onSelect(this.selectedIds);
  }

  /** Suma o quita un objeto de la selección (Mayús o Ctrl + clic). */
  toggleSelect(id: string) {
    this.setSelection(this.selectedIds.includes(id) ? this.selectedIds.filter((x) => x !== id) : [...this.selectedIds, id]);
  }

  private singleGroup() {
    return this.selectedIds.length === 1 ? this.objects.get(this.selectedIds[0]) : undefined;
  }

  private selectionCenter() {
    const c = new THREE.Vector3();
    const groups = this.selectedIds.map((id) => this.objects.get(id)!).filter(Boolean);
    for (const g of groups) c.add(g.position);
    return groups.length ? c.multiplyScalar(1 / groups.length) : c;
  }

  /** Engancha el gizmo al objeto (uno) o al pivote (varios). */
  private attachGizmo() {
    const n = this.selectedIds.length;
    if (n === 0) this.gizmo.detach();
    else if (n === 1) this.gizmo.attach(this.objects.get(this.selectedIds[0])!);
    else {
      this.pivot.position.copy(this.selectionCenter());
      this.pivot.quaternion.identity();
      this.gizmo.attach(this.pivot);
    }
    this.setGizmoMode(this.mode);
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
    if (!prev || prev.w !== l.w || prev.h !== l.h || prev.mist !== l.mist || prev.light !== l.light || prev.height !== l.height) this.buildMist(l);
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

  /**
   * Dos láminas de neblina a poca altura: transparentes sobre la zona editable, cada vez más espesas hacia fuera hasta
   * tapar del todo el terreno de relleno (del color del fondo, así no se nota dónde acaba).
   */
  private buildMist(l: BoardLayout) {
    for (const m of this.mistRoot.children as THREE.Mesh[]) (m.material as THREE.Material).dispose();
    this.mistRoot.clear();
    this.mistTexture?.dispose();
    this.mistTexture = null;
    if (l.mist <= 0) return;
    const E = Math.max(l.w, l.h); // el terreno de relleno llega hasta E casillas fuera del mundo
    const size = { w: l.w + 2 * E, h: l.h + 2 * E };
    const R = 1024;
    const k = R / Math.max(size.w, size.h); // píxeles por casilla
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(size.w * k);
    canvas.height = Math.round(size.h * k);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // se recorta el mundo (apenas ensanchado y poco difuminado): en la línea amarilla la neblina ya es notoria y
    // a unas 3 casillas es opaca, con un degradado suave en el borde (el usuario no quiere ver nada de lo de fuera)
    ctx.globalCompositeOperation = "destination-out";
    ctx.filter = `blur(${Math.round(1.4 * k)}px)`;
    const grow = 0.4 * k;
    ctx.fillRect(E * k - grow, E * k - grow, l.w * k + 2 * grow, l.h * k + 2 * grow);
    ctx.filter = "none";
    const tex = new THREE.CanvasTexture(canvas);
    this.mistTexture = tex;
    const color = new THREE.Color(LIGHT_PRESETS[l.light].bg);
    let top = 0;
    for (const h of l.height) top = Math.max(top, h * LEVEL);
    // tres láminas a distinta altura: juntas tapan casi del todo (la última también esconde lo bajito de fuera)
    for (const [dy, opacity] of [[0.3, 1], [1.2, 0.95], [2.6, 0.9]] as const) {
      const mat = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: opacity * (0.55 + 0.45 * l.mist), depthWrite: false, toneMapped: false, fog: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size.w, size.h), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(l.w / 2, top + dy, l.h / 2);
      mesh.renderOrder = 5;
      this.mistRoot.add(mesh);
    }
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
              this.baseScenes.set(id, g.scene);
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
        if (this.selectedIds.includes(id)) this.setSelection(this.selectedIds.filter((x) => x !== id));
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
        if (this.selectedIds.includes(o.id)) this.attachGizmo();
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

  /** Luz del objeto: un foco cálido en las partes luminosas del modelo y un halo que se ve en la foto de la TV. */
  private applyObjectLight(g: THREE.Group, o: PlacedObject) {
    const lt = lightOf(o);
    let rig = g.userData.rig as THREE.Group | undefined;
    if (!lt?.on) {
      if (rig) this.disposeRig(g);
      const lamp = this.lamps.get(o.model);
      if (lamp && g.userData.glowReady) this.setGlowParts(g, lamp, null);
      return;
    }
    const box = this.boxes.get(o.model);
    const base = this.baseScenes.get(o.model);
    if (!box || !base) return; // el modelo aún no cargó: se vuelve a llamar al cargar
    let lamp = this.lamps.get(o.model);
    if (!lamp) {
      lamp = findLamp(base);
      this.lamps.set(o.model, lamp);
    }
    // una luz por lámpara (las ventanitas amarillas de cada farol); si el modelo no las tiene, una en lo alto
    const spots: THREE.Vector3[] = lamp.anchors.length
      ? lamp.anchors
      : [new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y + (box.max.y - box.min.y) * 0.72, (box.min.z + box.max.z) / 2)];
    if (rig && rig.children.length !== spots.length) {
      this.disposeRig(g);
      rig = undefined;
    }
    if (!rig) {
      rig = new THREE.Group();
      for (const at of spots) {
        // foco hacia abajo (no un punto): alumbra el suelo y lo de alrededor, pero no el poste, que está pegado a la
        // luz y se vería como un tubo brillante
        const light = new THREE.SpotLight();
        light.angle = Math.PI * 0.32;
        light.penumbra = 0.7;
        light.decay = 1.5;
        light.target.position.set(0, -1, 0);
        if (this.viewer) light.visible = false; // en la TV las luces reales son pocas y siguen a la cámara (collectViewerLamps)
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow(), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
        // sin prueba de profundidad: el halo mira siempre a la cámara y el suelo lo cortaba en una línea recta horizontal
        sprite.renderOrder = 4;
        const lampGroup = new THREE.Group();
        // una vela (o brasero) tiene la llama casi pegada a su base: el foco desde ahí deja una mancha amarilla dura sobre la
        // losa y casi nada alrededor. Se sube el punto de luz hasta ~1,3 sobre la base del modelo para que reparta suave.
        const lift = Math.max(0, 1.3 - (at.y - box.min.y) * g.scale.y) / g.scale.y;
        lampGroup.position.copy(at).add(new THREE.Vector3(0, lift, 0));
        sprite.position.y = -lift; // el halo se queda en la llama; solo sube el foco
        lampGroup.add(light, sprite, light.target);
        rig.add(lampGroup);
      }
      g.add(rig);
      g.userData.rig = rig;
    }
    for (const lampGroup of rig.children as THREE.Group[]) {
      const [light, sprite] = lampGroup.children as [THREE.SpotLight, THREE.Sprite];
      light.color.set(lt.color);
      light.intensity = lt.intensity;
      light.distance = lt.distance;
      sprite.material.color.set(lt.color);
      sprite.material.opacity = Math.min(0.95, 0.45 + lt.intensity / 150);
      const world = Math.min(2.6, 0.9 + lt.distance * 0.06); // tamaño del halo en casillas
      sprite.scale.set(world / g.scale.x, world / g.scale.y, 1);
    }
    this.setGlowParts(g, lamp, lt.intensity);
  }

  private disposeRig(g: THREE.Group) {
    const rig = g.userData.rig as THREE.Group | undefined;
    if (!rig) return;
    for (const lampGroup of rig.children as THREE.Group[]) (lampGroup.children[1] as THREE.Sprite).material.dispose();
    g.remove(rig);
    g.userData.rig = undefined;
  }

  /** Hace brillar las partes amarillas del objeto (cada objeto lleva sus propios materiales para poder apagarlas). */
  private setGlowParts(g: THREE.Group, lamp: Lamp, intensity: number | null) {
    if (!lamp.emissiveMap) return;
    if (!g.userData.glowReady) {
      if (intensity === null) return;
      let cloned = 0;
      g.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || Array.isArray(mesh.material) || !(mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) return; // no el charco de luz
        const m = (mesh.material as THREE.MeshStandardMaterial).clone();
        m.emissiveMap = lamp.emissiveMap;
        m.emissive.set("#ffffff");
        mesh.material = m;
        cloned++;
      });
      // si el modelo aún no se añadió al grupo (ya estaba en caché y se carga en el siguiente tick) no hay nada
      // que encender: se vuelve a intentar cuando llegue
      if (!cloned) return;
      g.userData.glowReady = true;
    }
    const k = intensity === null ? 0 : Math.min(3.2, 1.4 + intensity / 25); // las ventanitas se ven encendidas de verdad
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material) && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = k;
    });
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
    if (this.tool === "select" && this.gizmo.axis === null) this.marquee = { x0: e.clientX, y0: e.clientY, active: false };
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
    if (this.marquee) this.updateMarquee(e);
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
    if (this.marquee?.active) {
      this.finishMarquee(e);
      return;
    }
    this.marquee = null;
    if (!down || e.target !== this.renderer.domElement) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5;
    if (moved) return;
    if (this.tool === "stamp") {
      const g = this.pickGround(e);
      if (g) this.events.onStamp(g.x, g.y, g.z);
      return;
    }
    if (this.tool === "select" && !this.gizmo.dragging && this.gizmo.axis === null) {
      const id = this.pickObject(e);
      // Mayús o Ctrl: suma o quita ese objeto de la selección; sin ellos, solo ese objeto (o ninguno)
      if (id && (e.shiftKey || e.ctrlKey || e.metaKey)) this.toggleSelect(id);
      else if (!id && (e.shiftKey || e.ctrlKey || e.metaKey)) return;
      else this.select(id);
    }
  };

  // ------------------------------------------------------------------ recuadro de selección

  private localPoint(e: { clientX: number; clientY: number }) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private updateMarquee(e: PointerEvent) {
    const m = this.marquee;
    if (!m || (e.buttons & 1) === 0) return;
    if (!m.active && Math.hypot(e.clientX - m.x0, e.clientY - m.y0) < 6) return;
    m.active = true;
    const a = this.localPoint({ clientX: m.x0, clientY: m.y0 });
    const b = this.localPoint(e);
    Object.assign(this.marqueeEl.style, {
      display: "block",
      left: `${Math.min(a.x, b.x)}px`,
      top: `${Math.min(a.y, b.y)}px`,
      width: `${Math.abs(a.x - b.x)}px`,
      height: `${Math.abs(a.y - b.y)}px`,
    });
  }

  /** Elige los objetos cuyo centro cae dentro del recuadro (con Mayús o Ctrl se suman a los que ya había). */
  private finishMarquee(e: PointerEvent) {
    const m = this.marquee!;
    this.marquee = null;
    this.marqueeEl.style.display = "none";
    const a = this.localPoint({ clientX: m.x0, clientY: m.y0 });
    const b = this.localPoint(e);
    const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
    const [y0, y1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const inside: string[] = [];
    for (const [id, g] of this.objects) {
      const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3()).project(this.camera);
      const [px, py] = [((c.x + 1) / 2) * w, ((1 - c.y) / 2) * h];
      if (px >= x0 && px <= x1 && py >= y0 && py <= y1) inside.push(id);
    }
    this.setSelection(e.shiftKey || e.ctrlKey || e.metaKey ? [...this.selectedIds, ...inside] : inside);
  }

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
    const g = this.singleGroup();
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

  private placedOf(g: THREE.Group): PlacedObject {
    g.userData.lastScale = g.scale.y;
    const { sx, sz } = g.userData;
    return {
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
    };
  }

  private emitEdited(final: boolean) {
    const g = this.singleGroup();
    if (g) this.events.onObjectsEdited([this.placedOf(g)], final);
  }

  // ------------------------------------------------------------------ varios objetos a la vez

  private startMulti() {
    if (!this.layout) return;
    const center = this.pivot.position.clone();
    const entries = this.selectedIds.map((id) => {
      const g = this.objects.get(id)!;
      return { id, pos: g.position.clone(), ry: g.rotation.y, lift: g.position.y - groundAt(this.layout!, g.position.x, g.position.z) };
    });
    this.multiStart = { center, entries };
  }

  /** Mueve y gira todos los objetos elegidos según lo que hizo el gizmo con el pivote. */
  private onMultiChange() {
    const st = this.multiStart;
    const l = this.layout;
    if (!st || !l) return;
    let dx = this.pivot.position.x - st.center.x;
    let dz = this.pivot.position.z - st.center.z;
    if (this.snap) [dx, dz] = [Math.round(dx), Math.round(dz)]; // saltos de una casilla: lo alineado sigue alineado
    const q = this.pivot.quaternion;
    const turn = 2 * Math.atan2(q.y, q.w); // giro alrededor de la vertical
    const [c, sn] = [Math.cos(turn), Math.sin(turn)];
    const list: PlacedObject[] = [];
    for (const e of st.entries) {
      const g = this.objects.get(e.id);
      if (!g) continue;
      const rx = e.pos.x - st.center.x;
      const rz = e.pos.z - st.center.z;
      const x = st.center.x + rx * c + rz * sn + dx;
      const z = st.center.z - rx * sn + rz * c + dz;
      g.position.set(x, groundAt(l, x, z) + e.lift, z);
      g.rotation.y = e.ry + turn;
      list.push(this.placedOf(g));
    }
    this.events.onObjectsEdited(list, false);
  }

  private finishMulti() {
    this.multiStart = null;
    const list = this.selectedIds.map((id) => this.objects.get(id)).filter((g): g is THREE.Group => !!g).map((g) => this.placedOf(g));
    this.events.onObjectsEdited(list, true);
    this.pivot.position.copy(this.selectionCenter());
    this.pivot.quaternion.identity();
  }

  /**
   * Gira la selección un cuarto de vuelta (las flechas ↺ ↻): uno solo sobre sí mismo, varios alrededor de su centro.
   * Después cada objeto se vuelve a encajar en la rejilla porque su huella cambia.
   */
  rotateSelection(turn: number) {
    const l = this.layout;
    const groups = this.selectedIds.map((id) => this.objects.get(id)).filter((g): g is THREE.Group => !!g);
    if (!l || !groups.length) return;
    const center = this.selectionCenter();
    // el centro del grupo se lleva a la rejilla (medias casillas) para que girar no desalinee nada
    const cx = groups.length > 1 ? Math.round(center.x * 2) / 2 : 0;
    const cz = groups.length > 1 ? Math.round(center.z * 2) / 2 : 0;
    const [c, sn] = [Math.cos(turn), Math.sin(turn)];
    for (const g of groups) {
      const lift = g.position.y - groundAt(l, g.position.x, g.position.z);
      let [x, z] = [g.position.x, g.position.z];
      if (groups.length > 1) [x, z] = [cx + (x - cx) * c + (z - cz) * sn, cz - (x - cx) * sn + (z - cz) * c];
      g.rotation.y += turn;
      if (this.snap) {
        const p = this.snapXZ(g.userData.model, x, z, g.rotation.y, g.scale.y, g.userData.sx, g.userData.sz);
        [x, z] = [p.x, p.z];
      }
      g.position.set(x, groundAt(l, x, z) + lift, z);
    }
    this.events.onObjectsEdited(groups.map((g) => this.placedOf(g)), true);
    this.attachGizmo();
  }

  /** Cada fotograma: pone las flechas de giro encima de lo elegido. */
  private updateHandle() {
    const el = this.handleEl;
    if (!el) return;
    if (!this.handleOn || !this.selectedIds.length) {
      el.style.display = "none";
      return;
    }
    const box = new THREE.Box3();
    for (const id of this.selectedIds) {
      const g = this.objects.get(id);
      if (g) box.union(new THREE.Box3().setFromObject(g));
    }
    const top = box.getCenter(new THREE.Vector3());
    top.y = box.max.y + 0.15;
    top.project(this.camera);
    const [w, h] = [this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight];
    el.style.display = "flex";
    el.style.transform = `translate(${((top.x + 1) / 2) * w}px, ${((1 - top.y) / 2) * h}px)`;
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
  /**
   * Foto del tablero para la TV con la cámara de `tvView`.
   *
   * Con `hd` (producción), en **mosaicos** de 2048 px a la resolución que hace falta para que la TV, acercada a
   * `tvView.tiles` casillas, se vea 1:1 en una pantalla de 3840 píxeles físicos (TV 4K o cualquier pantalla con escala
   * de 200 %, como el editor, que dibuja a la densidad real de la pantalla), hasta 16 000 px. Cada mosaico se sube
   * aparte y la TV solo descodifica los que enseña; además sale una imagen pequeña de todo (`overview`) que se ve
   * mientras cargan. Sin `hd` (desarrollo, sin Blob): una sola imagen de 2400 px en data URL.
   */
  async renderForTV(hd = false, maxSize = 8192): Promise<{ // (la imagen ya es solo el respaldo del 3D en vivo)
    image: string;
    overview?: Blob;
    chunks?: { size: number; cols: number; rows: number; blobs: Blob[] };
    width: number;
    height: number;
    tiles: { x: number; y: number }[];
    cell: number;
    bg: string;
    zoom: number;
  }> {
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
    const dir = new THREE.Vector3(...tvDirection(l.tvView));
    cam.position.copy(center).addScaledVector(dir, CAM_DIST);
    cam.lookAt(center);
    cam.updateMatrixWorld();
    // encuadre: la superficie del mundo; alrededor se ve el terreno que sigue, nunca el vacío
    let maxTop = 0;
    for (const h of l.height) maxTop = Math.max(maxTop, h * LEVEL);
    // (con margen por arriba para las fichas que están de pie en las casillas del fondo)
    // solo se encuadra donde hay juego (las casillas y unas 5 casillas de margen): así el mismo número de píxeles se
    // reparte en menos terreno y la TV se ve mucho más nítida que con el mundo entero
    const M = 5;
    const tx = l.tiles.flatMap((t) => [t.x, t.x + TILE_SIZE]);
    const tz = l.tiles.flatMap((t) => [t.y, t.y + TILE_SIZE]);
    const [bx0, bx1] = tx.length ? [Math.max(0, Math.min(...tx) - M), Math.min(l.w, Math.max(...tx) + M)] : [0, l.w];
    const [bz0, bz1] = tz.length ? [Math.max(0, Math.min(...tz) - M), Math.min(l.h, Math.max(...tz) + M)] : [0, l.h];
    const box = new THREE.Box3(new THREE.Vector3(bx0, 0, bz0), new THREE.Vector3(bx1, maxTop + 2.5, bz1));
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
    // píxeles por unidad del mundo: el rombo de una casilla mide TILE_SIZE·√2 unidades de ancho
    const tileW = TILE_SIZE * Math.SQRT2;
    const MAX = hd ? maxSize : 2400; // (maxSize: para pruebas con WebGL por software, que va lento)
    let ppu = hd ? 3840 / (tileW * l.tvView.tiles) : 2400 / (2 * hw);
    ppu = Math.min(ppu, MAX / (2 * hw), MAX / (2 * hh));
    const width = Math.round(2 * hw * ppu);
    const height = Math.round(2 * hh * ppu);

    const hidden = [this.grid, this.bounds, this.brush, this.gizmo.getHelper()].filter((o) => o.visible);
    for (const o of hidden) o.visible = false;
    const ratio = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    // por trozos (WebGL no deja pintar tan grande de una vez): cada uno con su parte de la cámara (setViewOffset)
    const gl = this.renderer.getContext();
    const vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    const chunk = Math.min(2048, vp[0], vp[1]);
    const cols = Math.ceil(width / chunk);
    const rows = Math.ceil(height / chunk);
    // imagen pequeña de todo: la de desarrollo, o la que se ve en la TV mientras cargan los mosaicos
    const small = hd ? Math.min(1, 2400 / width) : 1;
    const out = document.createElement("canvas");
    out.width = Math.round(width * small);
    out.height = Math.round(height * small);
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    const piece = document.createElement("canvas");
    const blobs: Blob[] = [];
    const toBlob = (c: HTMLCanvasElement, q: number) => new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("sin imagen"))), "image/webp", q));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const [x, y] = [c * chunk, r * chunk];
        const cw = Math.min(chunk, width - x);
        const ch = Math.min(chunk, height - y);
        cam.setViewOffset(width, height, x, y, cw, ch);
        this.renderer.setSize(cw, ch, false);
        this.renderer.render(this.scene, cam);
        ctx.drawImage(this.renderer.domElement, x * small, y * small, cw * small, ch * small);
        if (hd) {
          piece.width = cw;
          piece.height = ch;
          piece.getContext("2d")!.drawImage(this.renderer.domElement, 0, 0);
          blobs.push(await toBlob(piece, 0.92));
        }
      }
    cam.clearViewOffset();
    let image = "";
    let overview: Blob | undefined;
    if (hd) overview = await toBlob(out, 0.85);
    else {
      image = out.toDataURL("image/webp", 0.85);
      // la petición lleva también las fichas y Vercel admite ~4,5 MB: el tablero debe quedar por debajo de ~3,3 MB
      for (const q of [0.75, 0.62, 0.5, 0.4]) if (image.length > 3_300_000) image = out.toDataURL("image/webp", q);
    }
    this.renderer.setPixelRatio(ratio);
    for (const o of hidden) o.visible = true;
    this.resize();

    const toPx = (v: THREE.Vector3) => {
      const p = v.clone().project(cam);
      return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height };
    };
    const tiles = l.tiles.map((t) => toPx(new THREE.Vector3(t.x + TILE_SIZE / 2, this.tileTop(l, t) + 0.14, t.y + TILE_SIZE / 2)));
    // ancho en pantalla del rombo de una casilla (las fichas se escalan con él)
    const cell = tileW * ppu;
    const bg = "#" + (this.scene.background as THREE.Color).getHexString();
    // cuánto acerca la TV para que quepan tvView.tiles casillas a lo ancho
    const zoom = Math.max(1, width / (cell * l.tvView.tiles));
    return { image, overview, ...(hd && { chunks: { size: chunk, cols, rows, blobs } }), width, height, tiles, cell, bg, zoom };
  }
}
