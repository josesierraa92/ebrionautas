// Tablero de la TV en 3D en vivo (como un videojuego): el mismo motor del editor (EditorScene en modo visor) dibuja el
// diseño publicado a la resolución real de la pantalla, y aquí se añaden los jugadores como zombis 3D animados que
// caminan de casilla en casilla mirando hacia donde van. La cámara sigue a la ficha que toca.
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { loadAll, type Loaded } from "@/editor/characterSheet";
import { nameCssVars, TILE_SIZE, type BoardLayout } from "@/editor/layout";
import { EditorScene } from "@/editor/scene";
import { CHARACTER_HEIGHT, characterOf, TOKEN_TO_TILE } from "@/game/characters";
import type { Player } from "@/game/engine";
import { FLY_MS, STEP_MS } from "@/lib/useGameFx";

const TILE_W = TILE_SIZE * Math.SQRT2; // ancho de una casilla vista en pantalla, en unidades del mundo

type Token = {
  character: number;
  group: THREE.Group;
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  idle: THREE.AnimationAction | null;
  walk: THREE.AnimationAction | null;
  height: number;
  /** Casilla y punto donde está (o hacia donde va). */
  pos: number;
  goal: THREE.Vector3;
  from: THREE.Vector3;
  t: number; // 0..1 del paso actual
  dur: number; // ms del paso actual
  fly: boolean;
  yaw: number;
  yawGoal: number;
  label: HTMLDivElement;
  walking: boolean;
  /** Segundos que lleva sin moverse (para no volver a «quieto» entre dos pasos seguidos). */
  still: number;
  /** Ya llegó a su casilla de verdad (no está a mitad de una animación): mira a la casilla siguiente. */
  settled: boolean;
  /** Escala de serie del modelo y fase de la respiración (cada uno respira a su ritmo). */
  base: number;
  breath: number;
  amp: number;
};

export type LiveState = {
  players: Player[];
  current: string;
  winner?: string | null;
  shown?: Record<string, number>;
  flying?: string | null;
  focus?: string | null;
  characterScale: number;
};

export class LiveBoard {
  private scene: EditorScene;
  private chars: Loaded[] = [];
  private tokens = new Map<string, Token>();
  private shadowTex: THREE.Texture;
  private state: LiveState | null = null;
  private first = true;
  /** Fotogramas pintados (para saber si el aparato puede con el 3D). */
  frames = 0;

  constructor(
    container: HTMLElement,
    private labels: HTMLElement,
    private layout: BoardLayout,
    modelUrl: (id: string) => string | undefined,
  ) {
    this.scene = new EditorScene(container, { onStroke: () => undefined, onStrokeEnd: () => undefined, onSelect: () => undefined, onObjectsEdited: () => undefined, onStamp: () => undefined }, { viewer: true });
    this.scene.modelUrl = modelUrl;
    this.scene.onFrame = (dt) => this.frame(dt);
    this.scene.onAfterFrame = () => this.placeLabels();
    // aspecto de los nombres elegido en el editor («🧟 Fichas» → Nombre sobre el personaje)
    for (const [k, v] of Object.entries(nameCssVars(layout.names))) labels.style.setProperty(k, v);
    // sombra suave bajo los pies (las sombras del escenario están congeladas: los zombis no las proyectan)
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    this.shadowTex = new THREE.CanvasTexture(c);
  }

  /** Carga el escenario y los personajes; resuelve cuando está todo listo para enseñarse. */
  async start() {
    this.scene.setLayout(this.layout);
    const [, chars] = await Promise.all([this.scene.ready(), loadAll()]);
    this.chars = chars;
    if (this.state) this.update(this.state);
    // las fichas ya están en escena: sus shaders se compilan ahora, antes de enseñar el tablero (no con la TV a la vista)
    await this.scene.precompile();
  }

  dispose() {
    this.scene.dispose();
    for (const t of this.tokens.values()) t.label.remove();
    this.tokens.clear();
  }

  /** Nuevo estado de la partida (posiciones mostradas, quién vuela, a quién sigue la cámara…). */
  update(s: LiveState) {
    this.state = s;
    if (!this.chars.length) return;
    const at = (p: Player) => s.shown?.[p.id] ?? p.pos;
    // fichas que ya no están
    for (const [id, t] of this.tokens)
      if (!s.players.some((p) => p.id === id)) {
        t.group.removeFromParent();
        t.label.remove();
        this.tokens.delete(id);
      }
    const groups = new Map<number, Player[]>();
    for (const p of s.players) groups.set(at(p), [...(groups.get(at(p)) ?? []), p]);
    const right = this.scene.screenRight();
    const toward = new THREE.Vector3(right.z, 0, -right.x).negate(); // hacia la cámara, en el suelo
    for (const p of s.players) {
      const character = characterOf(s.players, p.id);
      let t = this.tokens.get(p.id);
      if (t && t.character !== character) {
        t.group.removeFromParent();
        t.label.remove();
        this.tokens.delete(p.id);
        t = undefined;
      }
      const pos = at(p);
      const center = this.scene.tileCenter(pos);
      if (!center) continue;
      // varias fichas en una casilla: en fila a lo ancho de la pantalla (y en cuadrícula si son muchas)
      const group = groups.get(pos)!;
      const i = group.indexOf(p);
      const n = group.length;
      const cols = n <= 4 ? n : Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const hOff = ((i % cols) - (cols - 1) / 2) * (n > 4 ? 0.2 : n > 2 ? 0.24 : 0.32) * TILE_W;
      const dOff = n > 4 ? (Math.floor(i / cols) - (rows - 1) / 2) * 0.17 * TILE_W : 0;
      const goal = center.clone().addScaledVector(right, hOff).addScaledVector(toward, dOff);
      const shrink = n > 8 ? 46 / 86 : n > 3 ? 62 / 86 : 1;
      const height = TOKEN_TO_TILE * TILE_W * CHARACTER_HEIGHT * s.characterScale * shrink;
      if (!t) {
        t = this.makeToken(p, character, goal, height);
        this.tokens.set(p.id, t);
      }
      if (Math.abs(t.height - height) > 1e-3) {
        t.model.scale.multiplyScalar(height / t.height);
        t.height = height;
      }
      if (t.pos !== pos || !t.goal.equals(goal)) {
        const flying = s.flying === p.id;
        t.from.copy(t.group.position);
        t.goal.copy(goal);
        t.t = 0;
        t.dur = flying ? FLY_MS : t.pos !== pos ? STEP_MS : 250;
        t.fly = flying;
        const d = goal.clone().sub(t.from);
        if (d.x * d.x + d.z * d.z > 1e-4) t.yawGoal = Math.atan2(d.x, d.z);
        t.pos = pos;
      }
      t.settled = pos === p.pos;
      t.label.textContent = p.name;
      t.label.dataset.name = p.name;
      t.label.style.setProperty("--c", p.color); // nombre blanco; la flechita, del color del jugador (el del cuadro de turno) y con luz neón
    }
    // la cámara sigue a la ficha que toca (o al jugador de turno)
    const f = this.tokens.get(s.focus ?? s.current);
    if (f) {
      this.scene.lookAt(f.goal.clone().add(new THREE.Vector3(0, 0.6, 0)), this.first);
      this.first = false;
    }
  }

  private makeToken(p: Player, character: number, at: THREE.Vector3, height: number): Token {
    const src = this.chars[character];
    const model = cloneSkinned(src.root);
    const size = new THREE.Box3().setFromObject(src.root).getSize(new THREE.Vector3());
    const base = height / size.y;
    model.scale.setScalar(base);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      // un poco de luz propia: de noche se distinguen del escenario sin parecer pegados encima
      mesh.material = ([mesh.material].flat() as THREE.MeshStandardMaterial[]).map((m) => {
        const c = m.clone();
        if (c.map) {
          c.emissive = new THREE.Color("#ffffff");
          c.emissiveMap = c.map;
          c.emissiveIntensity = 0.32;
        }
        return c;
      }) as unknown as THREE.Material;
      if (Array.isArray(mesh.material) && mesh.material.length === 1) mesh.material = mesh.material[0];
    });
    const group = new THREE.Group();
    group.position.copy(at);
    group.add(model);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    shadow.scale.setScalar(height * 0.9);
    group.add(shadow);
    this.scene.add(group);
    const mixer = new THREE.AnimationMixer(model);
    const clip = (name: string) => src.clips.find((c) => c.name === name);
    const idle = clip("idle") ? mixer.clipAction(clip("idle")!) : null;
    const walk = clip("walk") ? mixer.clipAction(clip("walk")!) : null;
    idle?.play();
    // cada uno respira a su ritmo
    mixer.setTime(Math.random() * 2);
    const label = document.createElement("div");
    label.className = "live-name";
    this.labels.appendChild(label);
    const yaw = this.idleYaw(p.pos) ?? Math.PI / 4;
    group.rotation.y = yaw;
    return { character, group, model, mixer, idle, walk, height, pos: p.pos, goal: at.clone(), from: at.clone(), t: 1, dur: STEP_MS, fly: false, yaw, yawGoal: yaw, label, walking: false, still: 1, settled: true, base, breath: Math.random() * Math.PI * 2, amp: 1 };
  }

  /** Quieto, mira hacia la casilla siguiente (en la última, en el sentido en que llegó). */
  private idleYaw(pos: number): number | null {
    const last = this.layout.tiles.length;
    const a = this.scene.tileCenter(pos === last ? pos - 1 : pos);
    const b = this.scene.tileCenter(pos === last ? pos : pos + 1);
    if (!a || !b) return null;
    return Math.atan2(b.x - a.x, b.z - a.z);
  }

  private frame(dt: number) {
    this.frames++;
    for (const t of this.tokens.values()) {
      const moving = t.t < 1;
      if (moving) {
        t.t = Math.min(1, t.t + (dt * 1000) / t.dur);
        const e = t.t < 0.5 ? 2 * t.t * t.t : 1 - Math.pow(-2 * t.t + 2, 2) / 2; // suave al salir y al llegar
        t.group.position.lerpVectors(t.from, t.goal, e);
        // un saltito en cada paso; en los vuelos, un arco alto
        t.group.position.y += Math.sin(Math.PI * t.t) * (t.fly ? 2.4 : 0.18) * (t.height / 1.0);
      } else if (t.settled) {
        // en reposo, mirando a la casilla siguiente
        const y = this.idleYaw(t.pos);
        if (y !== null) t.yawGoal = y;
      }
      // caminar mientras se mueve; respirar (idle) quieto
      // Entre un paso y el siguiente hay unas décimas de segundo en que la ficha «llegó» pero aún no sale la siguiente
      // casilla: no se vuelve a «quieto» hasta pasado un momento, para que camine seguido sin trompicones.
      t.still = moving ? 0 : t.still + dt;
      const walking = (moving && !t.fly) || (t.walking && t.still < 0.3 && !t.fly);
      if (walking !== t.walking && t.idle && t.walk) {
        const [from, to] = walking ? [t.idle, t.walk] : [t.walk, t.idle];
        from.fadeOut(0.2);
        to.reset().fadeIn(0.2).play();
        t.walking = walking;
      }
      // la animación elegida siempre corre (si se paró por algún motivo, se vuelve a poner en marcha)
      const on = walking ? t.walk : t.idle;
      if (on && !on.isRunning()) on.reset().fadeIn(0.2).play();
      // giro suave hacia donde va
      let d = t.yawGoal - t.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      t.yaw += d * (1 - Math.exp(-dt * 12));
      t.group.rotation.y = t.yaw;
      t.mixer.update(dt * (walking ? 1.4 : 1));
      // respiración visible: la animación «idle» del kit apenas mueve los brazos y desde la cámara de la TV no se notaba;
      // quieto, el cuerpo se estira y encoge un poco (unos 2,6 s por respiración); al caminar se apaga suave
      t.breath += dt * 2.4;
      t.amp += ((walking || t.fly ? 0 : 1) - t.amp) * (1 - Math.exp(-dt * 5));
      const k = Math.sin(t.breath) * 0.035 * t.amp;
      t.model.scale.set(t.base * (1 - k * 0.45), t.base * (1 + k), t.base * (1 - k * 0.45));
    }
  }

  /** Nombre encima de la cabeza, con la cámara ya colocada en este fotograma. */
  private placeLabels() {
    const w = this.labels.clientWidth || 1;
    const tilePx = w / this.layout.tvView.tiles; // ancho de una casilla en pantalla
    for (const t of this.tokens.values()) {
      const p = this.scene.toScreen(t.group.position.clone().add(new THREE.Vector3(0, t.height * 1.04, 0)));
      t.label.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      t.label.style.fontSize = `${Math.max(10, tilePx * 0.088) * (this.layout.names.size / 100)}px`;
    }
  }
}
