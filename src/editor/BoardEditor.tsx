"use client";

// Editor del tablero para el admin: pintar el terreno, subir/bajar el suelo y arrastrar modelos 3D.
// El diseño es un BoardLayout inmutable: cada cambio crea uno nuevo (así funciona deshacer).

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { History } from "./history";
import ObjectLightPanel from "./ObjectLightPanel";
import TilesPanel from "./TilesPanel";
import {
  flatten,
  TILE_COUNT,
  tileAt,
  toggleTile,
  GROUND_IDS,
  lightOf,
  GROUNDS,
  groundAt,
  LIGHTS,
  MAX_SIZE,
  MIN_SIZE,
  newLayout,
  newObjectId,
  paint,
  parseLayout,
  raise,
  resize,
  type BoardLayout,
  type GroundId,
  type LightId,
  type ObjectLight,
  type PlacedObject,
} from "./layout";
import { EditorScene, type GizmoMode, type Tool } from "./scene";

type CatalogModel = { id: string; kit: string; name: string; file: string; thumb: string };
type Catalog = { kits: { id: string; label: string; scale: number }[]; models: CatalogModel[] };

const DRAFT_KEY = "ebrio-editor:borrador";
const ADMIN_KEY = "ebrio-editor:clave";

const TOOLS: { id: Tool; icon: string; label: string; key: string }[] = [
  { id: "select", icon: "🖱️", label: "Seleccionar", key: "V" },
  { id: "paint", icon: "🖌️", label: "Pintar suelo", key: "B" },
  { id: "raise", icon: "⛰️", label: "Subir terreno", key: "U" },
  { id: "lower", icon: "🕳️", label: "Bajar terreno", key: "J" },
  { id: "flatten", icon: "📏", label: "Aplanar", key: "F" },
  { id: "tiles", icon: "🔢", label: "Casillas del juego", key: "T" },
];

const GIZMOS: { id: GizmoMode; label: string; key: string }[] = [
  { id: "translate", label: "Mover", key: "W" },
  { id: "rotate", label: "Girar", key: "E" },
  { id: "scale", label: "Tamaño", key: "R" },
];

function readDraft(): BoardLayout | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? parseLayout(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

const deg = (r: number) => Math.round((r * 180) / Math.PI);
const rad = (d: number) => (d * Math.PI) / 180;

export default function BoardEditor() {
  const viewRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EditorScene | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [layout, setLayoutState] = useState<BoardLayout>(() => newLayout());
  const layoutRef = useRef(layout);
  const history = useRef(new History<BoardLayout>());
  const strokeBefore = useRef<BoardLayout | null>(null);
  const flattenLevel = useRef(0);
  const shadowBefore = useRef<BoardLayout | null>(null);
  const tileMode = useRef<"add" | "remove">("add");
  const draftLoaded = useRef(false);

  const [tool, setTool] = useState<Tool>("select");
  const [ground, setGround] = useState<GroundId>("dirt");
  const [brushSize, setBrushSize] = useState(1);
  const [gizmo, setGizmo] = useState<GizmoMode>("translate");
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(true);
  const [randomTurn, setRandomTurn] = useState(true);
  const [stampModel, setStampModel] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [live, setLive] = useState<PlacedObject | null>(null);
  const [kit, setKit] = useState("todos");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [, setTick] = useState(0); // para refrescar los botones de deshacer
  const [size, setSize] = useState({ w: layout.w, h: layout.h });

  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const models = useMemo(() => new Map(catalog?.models.map((m) => [m.id, m]) ?? []), [catalog]);

  // ---------------------------------------------------------------- cambios del diseño

  const setLayout = useCallback((next: BoardLayout) => {
    layoutRef.current = next;
    setLayoutState(next);
  }, []);

  /** Aplica un cambio y lo apunta para poder deshacerlo. */
  const commit = useCallback(
    (next: BoardLayout) => {
      if (next === layoutRef.current) return;
      history.current.push(layoutRef.current);
      setLayout(next);
      setTick((t) => t + 1);
    },
    [setLayout],
  );

  const undo = useCallback(() => {
    const prev = history.current.undo(layoutRef.current);
    if (prev) {
      setLayout(prev);
      setTick((t) => t + 1);
    }
  }, [setLayout]);

  const redo = useCallback(() => {
    const next = history.current.redo(layoutRef.current);
    if (next) {
      setLayout(next);
      setTick((t) => t + 1);
    }
  }, [setLayout]);

  const addObject = useCallback(
    async (model: string, x: number, y: number, z: number, select: boolean) => {
      const kitScale = catalogRef.current?.kits.find((k) => model.startsWith(k.id + "/"))?.scale ?? 1;
      // giro al azar: con Ajustar, de 90° en 90° para que siga alineado con la rejilla
      const turn = randomTurn && !select ? (snap ? Math.floor(Math.random() * 4) * (Math.PI / 2) : Math.random() * Math.PI * 2) : 0;
      let o: PlacedObject = { id: newObjectId(), model, x, y, z, rx: 0, ry: turn, rz: 0, s: kitScale };
      if (snap && sceneRef.current) o = await sceneRef.current.snapObject(o, true);
      commit({ ...layoutRef.current, objects: [...layoutRef.current.objects, o] });
      if (select) {
        setTool("select");
        requestAnimationFrame(() => sceneRef.current?.select(o.id));
      }
    },
    [commit, randomTurn, snap],
  );

  const updateObject = useCallback(
    (id: string, patch: Partial<PlacedObject>) => {
      const l = layoutRef.current;
      commit({ ...l, objects: l.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
    },
    [commit],
  );

  // los controles deslizantes de la luz cambian el diseño en vivo y apuntan un solo paso para deshacer
  const lightBefore = useRef<BoardLayout | null>(null);
  const liveLight = (id: string, light: ObjectLight) => {
    const l = layoutRef.current;
    lightBefore.current ??= l;
    setLayout({ ...l, objects: l.objects.map((o) => (o.id === id ? { ...o, light } : o)) });
  };
  const endLiveLight = () => {
    const before = lightBefore.current;
    lightBefore.current = null;
    if (before && before !== layoutRef.current) {
      history.current.push(before);
      setTick((t) => t + 1);
    }
  };
  /** Copia esta luz a todos los objetos del mismo modelo (p. ej. todos los faroles). */
  const applyLightToAll = (model: string, light: ObjectLight) => {
    const l = layoutRef.current;
    commit({ ...l, objects: l.objects.map((o) => (o.model === model ? { ...o, light } : o)) });
    setStatus(`Luz aplicada a ${l.objects.filter((o) => o.model === model).length} objetos.`);
  };

  const removeSelected = useCallback(() => {
    if (!selected) return;
    const l = layoutRef.current;
    commit({ ...l, objects: l.objects.filter((o) => o.id !== selected) });
    setSelected(null);
  }, [commit, selected]);

  const duplicateSelected = useCallback(() => {
    const o = layoutRef.current.objects.find((x) => x.id === selected);
    if (!o) return;
    const copy = { ...o, id: newObjectId(), x: o.x + 1, z: o.z + 1 };
    copy.y = groundAt(layoutRef.current, copy.x, copy.z) + (o.y - groundAt(layoutRef.current, o.x, o.z));
    commit({ ...layoutRef.current, objects: [...layoutRef.current.objects, copy] });
    requestAnimationFrame(() => sceneRef.current?.select(copy.id));
  }, [commit, selected]);

  // ---------------------------------------------------------------- escena 3D

  useEffect(() => {
    fetch("/models/catalog.json")
      .then((r) => r.json())
      .then((c: Catalog) => setCatalog(c))
      .catch(() => setStatus("No se pudo cargar el catálogo de modelos."));
  }, []);

  // las herramientas que usan los callbacks de la escena se leen de refs (la escena se crea una vez)
  const toolRef = useRef({ tool, ground, brushSize, stampModel, addObject });
  toolRef.current = { tool, ground, brushSize, stampModel, addObject };

  useEffect(() => {
    if (!catalog || !viewRef.current) return;
    const scene = new EditorScene(viewRef.current, {
      onStroke: (x, y, phase) => {
        const t = toolRef.current;
        let l = layoutRef.current;
        if (phase === "start") {
          strokeBefore.current = l;
          flattenLevel.current = l.height[y * l.w + x];
          // casillas: si empieza sobre una casilla, el trazo quita; si no, pone
          tileMode.current = tileAt(l, x, y) ? "remove" : "add";
        }
        if (t.tool === "tiles") l = toggleTile(l, x, y, tileMode.current);
        if (t.tool === "paint") l = paint(l, x, y, t.brushSize, t.ground);
        if (t.tool === "raise") l = raise(l, x, y, t.brushSize, 1);
        if (t.tool === "lower") l = raise(l, x, y, t.brushSize, -1);
        if (t.tool === "flatten") l = flatten(l, x, y, t.brushSize, flattenLevel.current);
        setLayout(l);
      },
      onStrokeEnd: () => {
        const before = strokeBefore.current;
        strokeBefore.current = null;
        if (before && before !== layoutRef.current) {
          history.current.push(before);
          setTick((t) => t + 1);
        }
      },
      onSelect: (id) => {
        setSelected(id);
        setLive(null);
      },
      onObjectEdited: (o, final) => {
        if (!final) return setLive(o);
        setLive(null);
        const l = layoutRef.current;
        commit({ ...l, objects: l.objects.map((x) => (x.id === o.id ? { ...o, ...(x.light && { light: x.light }) } : x)) });
      },
      onStamp: (x, y, z) => {
        const t = toolRef.current;
        if (t.stampModel) t.addObject(t.stampModel, x, y, z, false);
      },
    });
    scene.modelUrl = (id) => models.get(id)?.file;
    sceneRef.current = scene;
    const draft = readDraft();
    if (draft) setLayout(draft);
    scene.setLayout(draft ?? layoutRef.current);
    draftLoaded.current = true;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [catalog, models, commit, setLayout]);

  useEffect(() => {
    sceneRef.current?.setLayout(layout);
    setSize({ w: layout.w, h: layout.h });
    // no guardar antes de haber leído el borrador: se pisaría con el tablero vacío del arranque
    if (!draftLoaded.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(layout));
      } catch {
        /* sin espacio: el borrador no se guarda, el diseño sigue en pantalla */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [layout]);

  useEffect(() => sceneRef.current?.setTool(tool), [tool, catalog]);
  useEffect(() => sceneRef.current?.setBrushSize(brushSize), [brushSize, catalog]);
  useEffect(() => sceneRef.current?.setGizmoMode(gizmo), [gizmo, catalog]);
  useEffect(() => sceneRef.current?.setSnap(snap), [snap, catalog]);
  useEffect(() => sceneRef.current?.setGrid(grid), [grid, catalog]);

  // ---------------------------------------------------------------- teclado

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && k === "y") {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && k === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (k === "delete" || k === "backspace") removeSelected();
      else if (k === "escape") {
        setTool("select");
        setStampModel(null);
        sceneRef.current?.select(null);
      } else if (!e.ctrlKey && !e.metaKey) {
        const t = TOOLS.find((x) => x.key.toLowerCase() === k);
        if (t) {
          setTool(t.id);
          setStampModel(null);
        }
        const g = GIZMOS.find((x) => x.key.toLowerCase() === k);
        if (g) setGizmo(g.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, duplicateSelected, removeSelected]);

  // ---------------------------------------------------------------- arrastrar del catálogo

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
    const model = e.dataTransfer.getData("text/x-model");
    const p = sceneRef.current?.pickGround(e);
    if (model && p) addObject(model, p.x, p.y, p.z, true);
  };

  // ---------------------------------------------------------------- guardar / cargar

  const adminKey = () => {
    let key = localStorage.getItem(ADMIN_KEY);
    if (!key) {
      key = window.prompt("Clave del admin (la variable ADMIN_PASSWORD de Vercel):") ?? "";
      if (key) localStorage.setItem(ADMIN_KEY, key);
    }
    return key;
  };

  const saveCloud = async () => {
    setStatus("Guardando…");
    try {
      const res = await fetch("/api/admin/board", {
        method: "PUT",
        headers: { "content-type": "application/json", "x-admin-key": adminKey() ?? "" },
        body: JSON.stringify({ layout: layoutRef.current }),
      });
      const body = await res.json();
      if (res.status === 401) localStorage.removeItem(ADMIN_KEY);
      setStatus(res.ok ? `Guardado en la nube a las ${new Date().toLocaleTimeString()}.` : body.error ?? "No se pudo guardar.");
    } catch {
      setStatus("No se pudo guardar (¿sin conexión?).");
    }
  };

  /** Renderiza el tablero con la cámara de la TV y lo publica: desde entonces las mesas lo usan. */
  const publish = async () => {
    const l = layoutRef.current;
    if (l.tiles.length < TILE_COUNT) {
      setTool("tiles");
      return setStatus(`Faltan ${TILE_COUNT - l.tiles.length} casillas: pon las 62 con la herramienta "Casillas del juego" (T).`);
    }
    if (!window.confirm("¿Publicar este tablero en la TV? Las mesas lo usarán en cuanto recarguen la página.")) return;
    const scene = sceneRef.current;
    if (!scene) return;
    try {
      setStatus("Renderizando el tablero…");
      const shot = await scene.renderForTV();
      setStatus("Subiendo…");
      const key = adminKey() ?? "";
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify(shot),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) localStorage.removeItem(ADMIN_KEY);
      if (!res.ok) return setStatus(body.error ?? "No se pudo publicar.");
      // el diseño publicado también queda guardado en la nube
      await fetch("/api/admin/board", {
        method: "PUT",
        headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ layout: l }),
      });
      setStatus("¡Publicado! Recarga la TV para verlo.");
    } catch {
      setStatus("No se pudo publicar (¿sin conexión?).");
    }
  };

  const unpublish = async () => {
    if (!window.confirm("¿Quitar tu tablero de la TV? Las mesas volverán al tablero de serie.")) return;
    const res = await fetch("/api/admin/publish", { method: "DELETE", headers: { "x-admin-key": adminKey() ?? "" } });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) localStorage.removeItem(ADMIN_KEY);
    setStatus(res.ok ? "La TV vuelve a usar el tablero de serie." : body.error ?? "No se pudo quitar.");
  };

  const loadCloud = async () => {
    if (!window.confirm("¿Cargar el diseño guardado en la nube? Lo que tienes en pantalla se puede recuperar con Deshacer.")) return;
    try {
      const body = await (await fetch("/api/admin/board", { cache: "no-store" })).json();
      const l = parseLayout(body.layout);
      if (!l) return setStatus(body.error ?? "Todavía no hay ningún diseño guardado en la nube.");
      commit(l);
      setStatus("Diseño de la nube cargado.");
    } catch {
      setStatus("No se pudo cargar.");
    }
  };

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(layoutRef.current)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tablero-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = (file: File | undefined) => {
    if (!file) return;
    file.text().then((text) => {
      try {
        const l = parseLayout(JSON.parse(text));
        if (!l) return setStatus("Ese archivo no es un diseño del tablero.");
        commit(l);
        setStatus("Diseño importado.");
      } catch {
        setStatus("Ese archivo no es un diseño del tablero.");
      }
    });
  };

  // ---------------------------------------------------------------- vista

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (catalog?.models ?? []).filter((m) => (kit === "todos" || m.kit === kit) && (!q || m.name.toLowerCase().includes(q)));
  }, [catalog, kit, search]);

  const sel = live && live.id === selected ? live : layout.objects.find((o) => o.id === selected);
  const btn = "rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors";
  const on = "bg-amber-400 text-black";
  const off = "bg-white/10 hover:bg-white/20";

  return (
    <div className="flex h-dvh flex-col bg-[#14161c] font-sans text-white select-none">
      {/* ------------------------------------------------ barra de arriba */}
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#1c1f27] px-3 py-2">
        <h1 className="mr-2 font-display text-lg text-amber-400">Editor del tablero</h1>
        <button className={`${btn} ${off}`} onClick={undo} disabled={!history.current.canUndo} title="Ctrl+Z">
          ↶ Deshacer
        </button>
        <button className={`${btn} ${off}`} onClick={redo} disabled={!history.current.canRedo} title="Ctrl+Y">
          ↷ Rehacer
        </button>
        <span className="mx-1 h-6 w-px bg-white/15" />
        <button className={`${btn} ${off}`} onClick={() => sceneRef.current?.resetView()}>
          📺 Vista TV
        </button>
        <label className="flex items-center gap-1 text-sm">
          Luz
          <select
            className="rounded-md bg-white/10 px-2 py-1"
            value={layout.light}
            onChange={(e) => commit({ ...layoutRef.current, light: e.target.value as LightId })}
          >
            {Object.entries(LIGHTS).map(([id, label]) => (
              <option key={id} value={id} className="bg-[#1c1f27]">
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-sm" title="Qué tan oscuras son las sombras">
          Sombras
          <input
            type="range"
            min={0}
            max={100}
            className="w-24"
            value={Math.round(layout.shadow * 100)}
            onPointerDown={() => (shadowBefore.current = layoutRef.current)}
            onChange={(e) => setLayout({ ...layoutRef.current, shadow: Number(e.target.value) / 100 })}
            onPointerUp={() => {
              if (shadowBefore.current && shadowBefore.current !== layoutRef.current) history.current.push(shadowBefore.current);
              shadowBefore.current = null;
              setTick((t) => t + 1);
            }}
          />
        </label>
        <button className={`${btn} ${grid ? on : off}`} onClick={() => setGrid(!grid)}>
          # Rejilla
        </button>
        <button className={`${btn} ${snap ? on : off}`} onClick={() => setSnap(!snap)} title="Encajar los modelos en la rejilla: casillas enteras y giros de 90°">
          🧲 Ajustar
        </button>
        <span className="mx-1 h-6 w-px bg-white/15" />
        <label className="flex items-center gap-1 text-sm">
          Mundo
          <input
            type="number"
            min={MIN_SIZE}
            max={MAX_SIZE}
            className="w-14 rounded-md bg-white/10 px-1 py-1"
            value={size.w}
            onChange={(e) => setSize({ ...size, w: Number(e.target.value) })}
          />
          ×
          <input
            type="number"
            min={MIN_SIZE}
            max={MAX_SIZE}
            className="w-14 rounded-md bg-white/10 px-1 py-1"
            value={size.h}
            onChange={(e) => setSize({ ...size, h: Number(e.target.value) })}
          />
          {(size.w !== layout.w || size.h !== layout.h) && (
            <button className={`${btn} ${on}`} onClick={() => commit(resize(layoutRef.current, size.w, size.h))}>
              Aplicar
            </button>
          )}
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            className={`${btn} ${off}`}
            onClick={() => window.confirm("¿Empezar un tablero vacío? Se puede deshacer.") && commit({ ...newLayout(layout.w, layout.h), light: layout.light })}
          >
            Nuevo
          </button>
          <label className={`${btn} ${off} cursor-pointer`}>
            Importar
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
          </label>
          <button className={`${btn} ${off}`} onClick={exportFile}>
            Exportar
          </button>
          <button className={`${btn} ${off}`} onClick={loadCloud}>
            ☁️ Cargar
          </button>
          <button className={`${btn} bg-emerald-500 text-black hover:bg-emerald-400`} onClick={saveCloud}>
            ☁️ Guardar
          </button>
          <button
            className={`${btn} ${layout.tiles.length === TILE_COUNT ? "bg-fuchsia-500 text-white hover:bg-fuchsia-400" : off}`}
            onClick={publish}
            title={`Casillas: ${layout.tiles.length} / ${TILE_COUNT}`}
          >
            📺 Publicar en la TV
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ------------------------------------------------ herramientas */}
        <aside className="flex w-96 shrink-0 flex-col gap-3 overflow-y-auto border-r border-white/10 bg-[#1c1f27] p-3">
          <div className="grid gap-1">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                className={`${btn} flex items-center gap-2 text-left ${tool === t.id ? on : off}`}
                onClick={() => {
                  setTool(t.id);
                  setStampModel(null);
                }}
              >
                <span>{t.icon}</span>
                <span className="flex-1">{t.label}</span>
                <kbd className="text-xs opacity-60">{t.key}</kbd>
              </button>
            ))}
          </div>

          {tool === "tiles" && <TilesPanel layout={layout} onChange={commit} onUnpublish={unpublish} />}

          {tool !== "select" && tool !== "stamp" && tool !== "tiles" && (
            <label className="text-sm">
              Pincel: {brushSize}×{brushSize}
              <input type="range" min={1} max={9} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full" />
            </label>
          )}

          {tool === "paint" && (
            <div className="grid grid-cols-2 gap-1.5">
              {GROUND_IDS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGround(g)}
                  className={`flex items-center gap-1.5 rounded-lg p-1 text-left text-xs ${ground === g ? "ring-2 ring-amber-400" : "hover:bg-white/10"}`}
                >
                  <span className="h-6 w-6 shrink-0 rounded border border-black/40" style={{ background: GROUNDS[g].top }} />
                  {GROUNDS[g].label}
                </button>
              ))}
            </div>
          )}

          {tool === "stamp" && stampModel && (
            <div className="rounded-lg bg-white/5 p-2 text-sm">
              <p className="mb-1 font-semibold">Sellar modelo</p>
              <img src={models.get(stampModel)?.thumb} alt="" className="mx-auto h-20 w-20" />
              <p className="text-center text-xs opacity-80">{models.get(stampModel)?.name}</p>
              <p className="mt-1 text-xs opacity-70">Haz clic en el suelo para poner copias. Esc para terminar.</p>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input type="checkbox" checked={randomTurn} onChange={(e) => setRandomTurn(e.target.checked)} />
                Giro al azar (natural para árboles y rocas)
              </label>
            </div>
          )}

          {sel && (
            <div className="grid gap-2 rounded-lg bg-white/5 p-2 text-sm">
              <p className="font-semibold">{models.get(sel.model)?.name ?? sel.model}</p>
              <div className="flex gap-1">
                {GIZMOS.map((g) => (
                  <button key={g.id} className={`${btn} flex-1 px-1 ${gizmo === g.id ? on : off}`} onClick={() => setGizmo(g.id)} title={`Tecla ${g.key}`}>
                    {g.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-between gap-2">
                Giro
                <input
                  type="number"
                  step={15}
                  className="w-20 rounded-md bg-white/10 px-1 py-0.5"
                  value={deg(sel.ry)}
                  onChange={(e) => updateObject(sel.id, { ry: rad(Number(e.target.value)) })}
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                Inclinación
                <input
                  type="number"
                  step={5}
                  className="w-20 rounded-md bg-white/10 px-1 py-0.5"
                  value={deg(sel.rx)}
                  onChange={(e) => updateObject(sel.id, { rx: rad(Number(e.target.value)) })}
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                Tamaño
                <input
                  type="number"
                  step={0.1}
                  min={0.05}
                  className="w-20 rounded-md bg-white/10 px-1 py-0.5"
                  value={Math.round(sel.s * 100) / 100}
                  onChange={(e) => updateObject(sel.id, { s: Math.max(0.05, Number(e.target.value) || 1) })}
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                Altura
                <input
                  type="number"
                  step={0.05}
                  className="w-20 rounded-md bg-white/10 px-1 py-0.5"
                  value={Math.round((sel.y - groundAt(layout, sel.x, sel.z)) * 100) / 100}
                  onChange={(e) => updateObject(sel.id, { y: groundAt(layoutRef.current, sel.x, sel.z) + Number(e.target.value) })}
                />
              </label>
              <ObjectLightPanel
                obj={sel}
                name={models.get(sel.model)?.name ?? sel.model}
                onSet={(light) => updateObject(sel.id, { light })}
                onLive={(light) => liveLight(sel.id, light)}
                onLiveEnd={endLiveLight}
                onApplyAll={(light) => applyLightToAll(sel.model, light)}
              />
              <div className="grid grid-cols-2 gap-1">
                <button className={`${btn} ${off}`} onClick={() => updateObject(sel.id, { y: groundAt(layoutRef.current, sel.x, sel.z) })}>
                  Al suelo
                </button>
                <button
                  className={`${btn} col-span-2 ${off}`}
                  title="Alinea el objeto con la rejilla y, si es una losa o un camino, le da el tamaño de casillas enteras"
                  onClick={async () => {
                    const o = layoutRef.current.objects.find((x) => x.id === sel.id);
                    if (!o || !sceneRef.current) return;
                    const n = await sceneRef.current.snapObject(o, true);
                    updateObject(o.id, { ...n, sx: n.sx, sz: n.sz }); // sx/sz sin definir = sin estirar
                  }}
                >
                  🧲 Encajar en la rejilla
                </button>
                <button className={`${btn} ${off}`} onClick={duplicateSelected} title="Ctrl+D">
                  Duplicar
                </button>
                <button className={`${btn} col-span-2 bg-red-500/80 hover:bg-red-500`} onClick={removeSelected} title="Supr">
                  Borrar
                </button>
              </div>
            </div>
          )}

          <div className="mt-auto text-xs leading-relaxed opacity-60">
            <p>Clic derecho + arrastrar: girar la cámara</p>
            <p>Shift + clic derecho: desplazar</p>
            <p>Rueda: acercar / alejar</p>
            <p>Arrastra un modelo del catálogo al suelo, o haz clic en él para sellar copias.</p>
            <p>Ctrl+Z deshacer · Ctrl+D duplicar · Supr borrar</p>
          </div>
        </aside>

        {/* ------------------------------------------------ vista 3D */}
        <main
          className="relative min-w-0 flex-1"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onPointerDown={() => (document.activeElement as HTMLElement | null)?.blur()}
        >
          <div ref={viewRef} className="absolute inset-0" />
          {!catalog && <p className="absolute inset-0 grid place-items-center text-lg opacity-70">Cargando modelos…</p>}
          {status && (
            <button className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm" onClick={() => setStatus("")}>
              {status}
            </button>
          )}
          <p className="absolute right-3 bottom-3 rounded bg-black/50 px-2 py-1 text-xs opacity-80">
            {layout.objects.length} modelos · {layout.objects.filter((o) => lightOf(o)?.on).length} luces · mundo {layout.w}×{layout.h}
          </p>
        </main>

        {/* ------------------------------------------------ catálogo */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-white/10 bg-[#1c1f27]">
          <div className="grid gap-2 p-3">
            <p className="font-display text-amber-400">Catálogo</p>
            <div className="flex flex-wrap gap-1">
              {[{ id: "todos", label: "Todos" }, ...(catalog?.kits ?? [])].map((k) => (
                <button key={k.id} className={`${btn} px-2 py-1 text-xs ${kit === k.id ? on : off}`} onClick={() => setKit(k.id)}>
                  {k.label}
                </button>
              ))}
            </div>
            <input
              placeholder="Buscar (tree, grave, rock…)"
              className="rounded-md bg-white/10 px-2 py-1.5 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid flex-1 grid-cols-3 content-start gap-1.5 overflow-y-auto px-3 pb-3">
            {visible.map((m) => (
              <button
                key={m.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/x-model", m.id)}
                onClick={() => {
                  setStampModel(m.id);
                  setTool("stamp");
                }}
                title={m.name}
                className={`rounded-lg bg-white/5 p-1 hover:bg-white/15 ${stampModel === m.id ? "ring-2 ring-amber-400" : ""}`}
              >
                <img src={m.thumb} alt={m.name} loading="lazy" draggable={false} className="aspect-square w-full" />
                <span className="block truncate text-[10px] opacity-70">{m.name}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
