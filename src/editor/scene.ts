// Escena 3D del editor del tablero (Three.js en el navegador del admin). El diseño (BoardLayout) vive en
// React; esta clase solo lo dibuja (setLayout), recoge el ratón y avisa con callbacks.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { brushCells, GROUNDS, groundAt, LEVEL, LIQUIDS, type BoardLayout, type LightId, type PlacedObject } from "./layout";

export type Tool = "select" | "paint" | "raise" | "lower" | "flatten" | "stamp";
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
const CAM_DIST = 200; // distancia de la cámara ortográfica al centro (la niebla se mide desde ahí)

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
  dia: { bg: "#bcd8f0", fog: null, sky: "#d9ecff", ground: "#5a4a3a", hemi: 1.6, sun: "#fff3e0", sunI: 2.6, sunPos: [-10, 18, 3] },
  atardecer: { bg: "#e9a07a", fog: [0.2, 2.2], sky: "#ffc8a0", ground: "#4a3040", hemi: 1.1, sun: "#ff9a50", sunI: 2.4, sunPos: [-14, 8, 6] },
  noche: { bg: "#0e1420", fog: [0, 1.6], sky: "#4a5d86", ground: "#0d0f14", hemi: 1.0, sun: "#9db8ff", sunI: 1.3, sunPos: [-8, 16, -4] },
  niebla: { bg: "#8a929a", fog: [-0.4, 1.0], sky: "#c9d0d6", ground: "#4a4a48", hemi: 1.5, sun: "#e8eef2", sunI: 0.9, sunPos: [-10, 18, 3] },
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
  private brush: THREE.LineSegments;
  private objectRoot = new THREE.Group();
  private objects = new Map<string, THREE.Group>();
  private loader = new GLTFLoader();
  private models = new Map<string, Promise<THREE.Object3D | null>>();
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.scene.add(this.hemi, this.sun, this.sun.target, this.objectRoot, this.grid);
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
      if (!e.value) this.emitEdited(true);
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
    this.gizmo.setTranslationSnap(this.snap ? 0.25 : null);
    this.gizmo.setRotationSnap(this.snap ? Math.PI / 12 : null);
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
    if (!prev || prev.ground !== l.ground || prev.height !== l.height) this.buildTerrain(l);
    if (!prev || prev.w !== l.w || prev.h !== l.h) {
      this.buildGrid(l);
      this.resetView();
    }
    if (!prev || prev.light !== l.light) this.applyLight(l);
    if (!prev || prev.objects !== l.objects) this.syncObjects(l.objects);
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
    for (let y = 0; y < l.h; y++)
      for (let x = 0; x < l.w; x++) {
        const i = y * l.w + x;
        const g = GROUNDS[l.ground[i]];
        const liquid = LIQUIDS.includes(l.ground[i]);
        const top = solidTop(i);
        const shade = cellShade(i);
        c.set(liquid ? g.side : g.top).multiplyScalar(shade);
        quad(pos, col, c, [x, top, y], [x, top, y + 1], [x + 1, top, y + 1], [x + 1, top, y]);
        if (liquid) {
          const s = l.height[i] * LEVEL - 0.15;
          c.set(g.top).multiplyScalar(0.97 + (shade - 1) * 0.3);
          quad(lpos, lcol, c, [x, s, y], [x, s, y + 1], [x + 1, s, y + 1], [x + 1, s, y]);
        }
        // lados: solo donde el vecino es más bajo (o en el borde del mundo)
        const sides: [number, number, number[], number[]][] = [
          [x + 1, y, [x + 1, 0, y + 1], [x + 1, 0, y]],
          [x - 1, y, [x, 0, y], [x, 0, y + 1]],
          [x, y + 1, [x, 0, y + 1], [x + 1, 0, y + 1]],
          [x, y - 1, [x + 1, 0, y], [x, 0, y]],
        ];
        for (const [nx, ny, a, b] of sides) {
          const inWorld = nx >= 0 && ny >= 0 && nx < l.w && ny < l.h;
          const bottom = inWorld ? solidTop(ny * l.w + nx) : BASE;
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

  private buildGrid(l: BoardLayout) {
    this.grid.clear();
    const pts: number[] = [];
    for (let x = 0; x <= l.w; x++) pts.push(x, 0, 0, x, 0, l.h);
    for (let y = 0; y <= l.h; y++) pts.push(0, 0, y, l.w, 0, y);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#000000", transparent: true, opacity: 0.18 }));
    lines.position.y = 2 * LEVEL + 0.01;
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
                if ((o as THREE.Mesh).isMesh) {
                  o.castShadow = true;
                  o.receiveShadow = true;
                }
              });
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
          if (m && this.objects.get(o.id) === group) group.add(m.clone(true));
        });
        if (this.selected === o.id) this.gizmo.attach(group);
      }
      g.position.set(o.x, o.y, o.z);
      g.rotation.set(o.rx, o.ry, o.rz);
      g.scale.setScalar(o.s);
    }
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
    this.stroking = true;
    this.lastCell = `${g.cx},${g.cy}`;
    this.events.onStroke(g.cx, g.cy, "start");
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.tool === "select") return;
    const g = this.pickGround(e);
    this.updateBrush(g);
    if (!this.stroking || !g) return;
    const key = `${g.cx},${g.cy}`;
    if (key === this.lastCell) return;
    this.lastCell = key;
    this.events.onStroke(g.cx, g.cy, "move");
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
    if (mode === "translate") g.position.y = groundAt(this.layout, g.position.x, g.position.z) + this.dragOffset;
    if (mode === "scale") {
      // tamaño uniforme: manda el eje que más cambió
      const s = g.scale;
      const prev = g.userData.lastScale ?? 1;
      const v = [s.x, s.y, s.z].reduce((a, b) => (Math.abs(b - prev) > Math.abs(a - prev) ? b : a), prev);
      s.setScalar(Math.max(0.05, v));
      g.userData.lastScale = s.x;
    }
    this.emitEdited(false);
  }

  private emitEdited(final: boolean) {
    const g = this.selectedGroup();
    if (!g) return;
    g.userData.lastScale = g.scale.x;
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
        s: g.scale.x,
      },
      final,
    );
  }

  /** Imagen de lo que se ve (para guardar una miniatura del diseño). */
  snapshot(): string {
    return this.renderer.domElement.toDataURL("image/webp", 0.85);
  }
}
