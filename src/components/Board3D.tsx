"use client";

import { ContactShadows, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { avatarOf } from "@/game/avatar";
import { BOARD, type Tile } from "@/game/board";
import type { Player } from "@/game/engine";
import { RING, RING_D, RING_W, ringTile, type RingTile } from "@/game/ringPath";
import { TILE_STYLE, tileLabel } from "@/game/tileStyle";

// Tablero 3D estilo "Monopoly online": anillo de casillas con colores pastel,
// plaza central decorada, luz suave con sombras y marcianos 3D como fichas.

type Props = {
  players: Player[];
  current: string;
  winner?: string | null;
  /** Posición mostrada de cada ficha (la animación va por detrás de la posición real). */
  shown?: Record<string, number>;
  /** Ficha que va volando (Oca, agujero negro…): salta en arco. */
  flying?: string | null;
};

export default function Board3D({ players, current, winner, shown, flying }: Props) {
  return (
    <Canvas shadows camera={{ position: [0, 21, 15], fov: 40 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
      <color attach="background" args={["#f3e3f7"]} />
      <hemisphereLight args={["#ffffff", "#d9b8e6", 1.1]} />
      <directionalLight
        position={[8, 18, 10]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0005}
      />
      <CameraRig />
      <Ground />
      <group>
        <BoardBase />
        {RING.map((t) => (
          <TileMesh key={t.n} ring={t} tile={BOARD[t.n - 1]} />
        ))}
        <Plaza />
        {players.map((p, i) => (
          <Alien3D
            key={p.id}
            player={p}
            index={i}
            pos={shown?.[p.id] ?? p.pos}
            players={players}
            shown={shown}
            active={p.id === current && !winner}
            flying={p.id === flying}
            winner={p.id === winner}
          />
        ))}
      </group>
      <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={40} blur={2.5} far={6} />
    </Canvas>
  );
}

const ELEVATION = (58 * Math.PI) / 180; // inclinación de la cámara (como en los juegos de tablero online)

/** Coloca la cámara para que el tablero llene la pantalla, sea cual sea su proporción. */
function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const { width, height } = useThree((s) => s.size);
  useLayoutEffect(() => {
    const aspect = width / height;
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const halfW = (RING_W + 1) / 2;
    // Fondo del tablero visto en perspectiva desde arriba en diagonal, más la altura de la Tierra y el OVNI.
    const halfD = ((RING_D + 1) / 2) * Math.sin(ELEVATION) + 1.4 * Math.cos(ELEVATION);
    // La fila de delante queda más cerca de la cámara y se ve más grande: margen extra.
    const dist = Math.max(halfW / Math.tan(hfov / 2) + (RING_D / 2) * Math.cos(ELEVATION), halfD / Math.tan(vfov / 2)) * 1.12;
    camera.position.set(0, Math.sin(ELEVATION) * dist, Math.cos(ELEVATION) * dist + 0.6);
    camera.lookAt(0, 0, 0.6);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);
  return null;
}

const PASTEL: Record<Tile["type"], string> = {
  SALIDA: "#4f9bff",
  META: "#ffc93c",
  POSADA: "#d9914f",
  A_BEBER: "#ffcf3a",
  DUELO: "#8fa3c8",
  OCA: "#3fc1f5",
  LABERINTO: "#45c46a",
  REGLA: "#a46bf0",
  CULTURAL: "#ff5d73",
  HIPNOSIS: "#ff6ec7",
  CARCEL: "#6f7f99",
  MUERTE: "#5b3a8c",
  PATINAZO: "#ff9a3c",
  POSICION: "#7ed957",
  RASGO: "#7ed957",
  ESCLAVO: "#9c9cab",
  RETO: "#2fb7f0",
};

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color="#e9d2f2" />
    </mesh>
  );
}

/** Base de madera del tablero y la plaza central hundida. */
function BoardBase() {
  return (
    <group>
      <RoundedBox args={[RING_W + 0.8, 0.6, RING_D + 0.8]} radius={0.25} position={[0, -0.3, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#b9784a" />
      </RoundedBox>
      <RoundedBox args={[RING_W - 4, 0.2, RING_D - 4]} radius={0.15} position={[0, 0.02, 0]} receiveShadow>
        <meshStandardMaterial color="#f6dcc0" />
      </RoundedBox>
    </group>
  );
}

/** Textura de cada casilla: cartón crema con franja de color, ícono, nombre y número. */
function useTileTexture(tile: Tile, corner: boolean) {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const W = 256;
    const H = corner ? 256 : Math.round((256 * 2) / 1.2);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    const color = PASTEL[tile.type];
    g.fillStyle = "#fbf3e4";
    g.fillRect(0, 0, W, H);
    g.fillStyle = color;
    g.fillRect(0, 0, W, corner ? H : H * 0.24);
    if (!corner) {
      g.fillStyle = "rgba(255,255,255,.35)";
      g.fillRect(0, 0, W, H * 0.06);
    }
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `bold ${corner ? 54 : 60}px "Lilita One", sans-serif`;
    g.lineWidth = 10;
    g.strokeStyle = "#3b2a52";
    g.fillStyle = "#ffffff";
    g.strokeText(String(tile.n), W / 2, corner ? H * 0.16 : H * 0.12);
    g.fillText(String(tile.n), W / 2, corner ? H * 0.16 : H * 0.12);
    g.font = `${corner ? 120 : 150}px "Apple Color Emoji","Noto Color Emoji",sans-serif`;
    g.fillText(TILE_STYLE[tile.type].icon, W / 2, corner ? H * 0.52 : H * 0.55);
    g.fillStyle = "#3b2a52";
    g.font = `bold ${corner ? 34 : 34}px "Lilita One", "Fredoka", sans-serif`;
    const label = tileLabel(tile).toUpperCase();
    g.fillText(label.length > 12 ? label.slice(0, 11) + "…" : label, W / 2, H * (corner ? 0.87 : 0.88));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [tile, corner]);
}

function TileMesh({ ring, tile }: { ring: RingTile; tile: Tile }) {
  const tex = useTileTexture(tile, ring.corner);
  const h = ring.corner ? 0.42 : 0.32;
  return (
    <group position={[ring.x, 0, ring.z]} rotation={[0, ring.rot, 0]}>
      <RoundedBox args={[ring.w - 0.08, h, ring.d - 0.08]} radius={0.08} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={ring.corner ? PASTEL[tile.type] : "#fbf3e4"} />
      </RoundedBox>
      {tex && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, h + 0.002, 0]} receiveShadow>
          <planeGeometry args={[ring.w - 0.2, ring.d - 0.2]} />
          <meshStandardMaterial map={tex} />
        </mesh>
      )}
      {tile.type === "META" && <Earth />}
      {tile.type === "SALIDA" && <Rocket />}
    </group>
  );
}

function Earth() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.4;
  });
  return (
    <group position={[0, 1.3, 0]} scale={0.7}>
      <mesh position={[0, -0.95, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.75, 0.5, 32]} />
        <meshStandardMaterial color="#ffb703" />
      </mesh>
      <group ref={ref}>
        <mesh castShadow>
          <sphereGeometry args={[0.85, 48, 48]} />
          <meshStandardMaterial color="#3a86ff" roughness={0.4} />
        </mesh>
        {[
          [0.5, 0.45, 0.5, 0.42],
          [-0.55, 0.1, 0.55, 0.38],
          [0.1, -0.5, -0.65, 0.35],
          [-0.2, 0.55, -0.6, 0.3],
        ].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x * 0.92, y * 0.92, z * 0.92]} castShadow>
            <sphereGeometry args={[r, 24, 24]} />
            <meshStandardMaterial color="#6bd36b" roughness={0.6} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 0, 0]} intensity={2} distance={4} color="#ffe58a" />
    </group>
  );
}

function Rocket() {
  return (
    <group position={[0.35, 0.3, 0.25]} rotation={[0, 0, 0.15]} scale={0.9}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.6, 8, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <coneGeometry args={[0.22, 0.35, 24]} />
        <meshStandardMaterial color="#ef476f" />
      </mesh>
      <mesh position={[0, 0.8, 0.2]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#4cc9f0" />
      </mesh>
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 0.24, 0.3, Math.cos(a) * 0.24]} rotation={[0, a, 0]} castShadow>
          <boxGeometry args={[0.04, 0.3, 0.2]} />
          <meshStandardMaterial color="#ef476f" />
        </mesh>
      ))}
    </group>
  );
}

/** Plaza central: lago de calimocho, árboles alienígenas y un OVNI. */
function Plaza() {
  const ufo = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ufo.current) {
      ufo.current.position.y = 3.2 + Math.sin(clock.elapsedTime * 1.5) * 0.2;
      ufo.current.rotation.y = clock.elapsedTime * 0.8;
    }
  });
  const trees: [number, number, string][] = [
    [-7, -5, "#7ed957"],
    [7.2, -5, "#b98bf0"],
    [-7.2, 5, "#b98bf0"],
    [7, 5, "#7ed957"],
    [-4.6, -5.3, "#b98bf0"],
    [4.6, -5.3, "#7ed957"],
  ];
  return (
    <group>
      <PlazaFloor />
      {trees.map(([x, z, color], i) => (
        <group key={i} position={[x, 0.12, z]}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.14, 0.7, 12]} />
            <meshStandardMaterial color="#9a5524" />
          </mesh>
          <mesh position={[0, 1.05, 0]} castShadow>
            <sphereGeometry args={[0.55, 24, 24]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      ))}
      <group ref={ufo} position={[0, 3.2, -3.4]}>
        <mesh castShadow>
          <cylinderGeometry args={[1.1, 0.5, 0.3, 32]} />
          <meshStandardMaterial color="#c0c7d6" metalness={0.3} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#9fe7ff" transparent opacity={0.75} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.sin((i * Math.PI) / 3) * 0.85, -0.05, Math.cos((i * Math.PI) / 3) * 0.85]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color={["#ffe066", "#e53fd6", "#5cd23c"][i % 3]} emissive={["#ffe066", "#e53fd6", "#5cd23c"][i % 3]} emissiveIntensity={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Suelo de la plaza: baldosas en damero, un círculo central y el logo pintado. */
function PlazaFloor() {
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const W = 1024;
    const H = Math.round((W * (RING_D - 4)) / (RING_W - 4));
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    const cell = W / 14;
    for (let y = 0; y < H / cell; y++)
      for (let x = 0; x < 14; x++) {
        g.fillStyle = (x + y) % 2 ? "#f6d9b8" : "#f0cba3";
        g.fillRect(x * cell, y * cell, cell, cell);
      }
    g.strokeStyle = "rgba(255,255,255,.8)";
    g.lineWidth = 8;
    g.setLineDash([22, 16]);
    g.strokeRect(cell * 0.6, cell * 0.6, W - cell * 1.2, H - cell * 1.2);
    g.setLineDash([]);
    g.fillStyle = "#e9b98a";
    g.beginPath();
    g.ellipse(W / 2, H / 2, W * 0.24, H * 0.26, 0, 0, Math.PI * 2);
    g.fill();
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `${W * 0.085}px "Lilita One", sans-serif`;
    g.lineJoin = "round";
    g.lineWidth = 22;
    g.strokeStyle = "#1b1f4b";
    g.fillStyle = "#ffc61a";
    g.strokeText("EBRIONAUTAS", W / 2, H / 2 - W * 0.02);
    g.fillText("EBRIONAUTAS", W / 2, H / 2 - W * 0.02);
    g.font = `${W * 0.03}px "Lilita One", sans-serif`;
    g.lineWidth = 10;
    g.fillStyle = "#ffffff";
    g.strokeText("Encuentros en la Tercera Copa", W / 2, H / 2 + W * 0.06);
    g.fillText("Encuentros en la Tercera Copa", W / 2, H / 2 + W * 0.06);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  if (!tex) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]} receiveShadow>
      <planeGeometry args={[RING_W - 4.1, RING_D - 4.1]} />
      <meshStandardMaterial map={tex} />
    </mesh>
  );
}

/** Centro de la ficha según su casilla; si varias comparten casilla se reparten. */
function tokenTarget(pos: number, id: string, players: Player[], shown?: Record<string, number>) {
  const t = ringTile(pos);
  const group = players.filter((q) => (shown?.[q.id] ?? q.pos) === pos);
  const i = group.findIndex((q) => q.id === id);
  const n = group.length;
  const spread = t.corner ? 0.7 : 0.42;
  const cols = n <= 2 ? n : 2;
  const col = i % cols;
  const row = Math.floor(i / cols);
  const rows = Math.ceil(n / cols);
  // Desplazamiento local (a lo largo del lado / hacia la plaza), rotado como la casilla.
  const lx = (col - (cols - 1) / 2) * spread;
  const lz = (row - (rows - 1) / 2) * spread * 1.2;
  const cos = Math.cos(t.rot);
  const sin = Math.sin(t.rot);
  return new THREE.Vector3(t.x + lx * cos + lz * sin, t.corner ? 0.42 : 0.32, t.z - lx * sin + lz * cos);
}

/** Marciano 3D: cuerpo de gomita, ojos grandes, antenas y patitas. */
function Alien3D({
  player,
  pos,
  players,
  shown,
  active,
  flying,
  winner,
  index,
}: {
  player: Player;
  pos: number;
  players: Player[];
  shown?: Record<string, number>;
  active: boolean;
  flying: boolean;
  winner: boolean;
  index: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const color = avatarOf(player).skin;
  const target = tokenTarget(pos, player.id, players, shown);
  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime + index;
    // Se desliza hacia su casilla dando saltitos.
    const dist = g.position.distanceTo(target);
    g.position.lerp(target, Math.min(1, dt * 7));
    // Volando: arco alto que baja al acercarse; caminando: saltitos; en su turno: bota en el sitio.
    const hop = flying && dist > 0.05 ? Math.min(2.2, dist * 0.45) : dist > 0.05 ? Math.abs(Math.sin(t * 14)) * 0.35 : active || winner ? Math.abs(Math.sin(t * 5)) * (winner ? 0.5 : 0.25) : 0;
    if (body.current) {
      body.current.position.y = hop;
      body.current.scale.y = 1 + Math.sin(t * 2.4) * 0.03;
    }
    g.rotation.y = winner ? t * 3 : flying && dist > 0.05 ? g.rotation.y + dt * 10 : 0;
  });
  return (
    <group ref={ref} position={target} scale={1.55}>
      <group ref={body}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <capsuleGeometry args={[0.24, 0.26, 8, 24]} />
          <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
        {[-0.11, 0.11].map((x) => (
          <group key={x} position={[x, 0.55, 0.19]}>
            <mesh>
              <sphereGeometry args={[0.085, 20, 20]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <sphereGeometry args={[0.042, 16, 16]} />
              <meshStandardMaterial color="#1b1f4b" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.38, 0.235]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.07, 0.016, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#1b1f4b" />
        </mesh>
        {[-0.1, 0.1].map((x) => (
          <group key={x} position={[x, 0.8, 0]} rotation={[0, 0, -x * 3]}>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
              <meshStandardMaterial color="#1b1f4b" />
            </mesh>
            <mesh position={[0, 0.22, 0]} castShadow>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
            </mesh>
          </group>
        ))}
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 0.07, 0.04]} castShadow>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.75)} />
          </mesh>
        ))}
      </group>
      {active && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.38, 32]} />
          <meshBasicMaterial color="#ffe066" />
        </mesh>
      )}
    </group>
  );
}
