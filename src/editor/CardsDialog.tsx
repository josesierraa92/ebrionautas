"use client";

// Ventana para ver y cambiar el texto de TODAS las tarjetas del juego (la que sale en la TV y en el celular al caer en
// una casilla). Las casillas que comparten tarjeta (p. ej. las 6 «Ronda de mezcal») se muestran una sola vez, con los
// números de casilla que la usan. Se guardan aparte del tablero y valen para todas las mesas (`/api/admin/cards`).
import { useEffect, useMemo, useState } from "react";
import { cardCatalog, fillCard, parseCardOverrides, RESULT_KEYS, type CardDef, type CardOverrides } from "@/game/cards";
import { createGame } from "@/game/engine";
import { tileVars } from "@/game/rules";
import { fetchCardTexts } from "@/lib/useCardTexts";
import { tileArt, TILE_STYLE } from "@/game/tileStyle";
import { BOARD } from "@/game/board";

const CARDS = cardCatalog();

/** Con qué se rellenan los huecos en la vista previa: una partida de ejemplo (Ana juega; Beto va detrás y Carla delante). */
function sampleVars(def: CardDef): Record<string, string | number> {
  if (def.tiles.length === 0) return def.key === RESULT_KEYS.jail ? { nombre: "Ana", dado: 5, vasos: "4 vasos" } : { nombre: "Ana", dado: def.key === RESULT_KEYS.mazeOk ? 6 : 3 };
  const n = def.tiles[0];
  const game = createGame([
    { name: "Ana", color: "#00ff88", gender: "mujer" },
    { name: "Beto", color: "#4488ff", gender: "hombre" },
    { name: "Carla", color: "#ff66aa", gender: "mujer" },
  ]);
  game.players[0].pos = n;
  game.players[1].pos = Math.max(1, n - 3);
  game.players[2].pos = n + 3;
  return { ...tileVars(n, game, game.players[0].id), categoria: "Animales" };
}

export default function CardsDialog({ adminKey, onClose, onStatus }: { adminKey: () => string; onClose: () => void; onStatus: (msg: string) => void }) {
  const [saved, setSaved] = useState<CardOverrides | null>(null);
  const [draft, setDraft] = useState<CardOverrides>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchCardTexts(true).then((o) => {
      setSaved(o);
      setDraft(o);
    });
  }, []);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CARDS;
    return CARDS.filter((c) => `${c.label} ${c.defaults.title} ${draft[c.key]?.title ?? ""} ${c.defaults.text} ${draft[c.key]?.text ?? ""} ${c.tiles.join(" ")}`.toLowerCase().includes(q));
  }, [search, draft]);

  const changed = saved !== null && JSON.stringify(parseCardOverrides(draft)) !== JSON.stringify(saved);
  const set = (key: string, field: "title" | "text", value: string) => setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));
  const reset = (key: string) =>
    setDraft((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cards", { method: "PUT", headers: { "content-type": "application/json", "x-admin-key": adminKey() }, body: JSON.stringify({ cards: parseCardOverrides(draft) }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return onStatus(body.error ?? "No se pudieron guardar las tarjetas.");
      const o = parseCardOverrides(body.cards);
      setSaved(o);
      setDraft(o);
      await fetchCardTexts(true);
      onStatus("Tarjetas guardadas. La TV y los celulares las verán al recargar la página.");
    } catch {
      onStatus("No se pudieron guardar las tarjetas (¿sin conexión?).");
    } finally {
      setBusy(false);
    }
  };

  const btn = "rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors";
  const off = "bg-white/10 hover:bg-white/20";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-4xl flex-col gap-3 overflow-hidden rounded-2xl bg-[#1c1f27] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl text-amber-400">📝 Tarjetas del juego</h2>
          <input placeholder="Buscar una tarjeta o un número de casilla…" className="ml-auto w-72 rounded-md bg-white/10 px-2 py-1 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className={`${btn} bg-emerald-500 text-black ${changed && !busy ? "" : "opacity-40"}`} disabled={!changed || busy} onClick={save}>
            {busy ? "Guardando…" : "💾 Guardar"}
          </button>
          <button className={`${btn} ${off}`} onClick={onClose}>
            Cerrar
          </button>
        </div>
        <p className="text-sm opacity-70">
          Aquí está cada tarjeta una sola vez (las casillas que comparten tarjeta salen juntas). Cambia el título o el texto; los{" "}
          <code className="rounded bg-white/10 px-1">{"{huecos}"}</code> se rellenan solos con los datos de la partida. Lo que no cambies se queda como está.
          {saved === null && " Cargando…"}
        </p>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {list.map((c) => (
            <CardEditor key={c.key} def={c} value={draft[c.key]} onChange={(f, v) => set(c.key, f, v)} onReset={() => reset(c.key)} />
          ))}
          {list.length === 0 && <p className="py-8 text-center text-sm opacity-60">Ninguna tarjeta coincide.</p>}
        </div>
      </div>
    </div>
  );
}

function CardEditor({ def, value, onChange, onReset }: { def: CardDef; value: { title?: string; text?: string } | undefined; onChange: (f: "title" | "text", v: string) => void; onReset: () => void }) {
  const title = value?.title ?? def.defaults.title;
  const text = value?.text ?? def.defaults.text;
  const edited = (value?.title !== undefined && value.title !== def.defaults.title) || (value?.text !== undefined && value.text !== def.defaults.text);
  const first = def.tiles[0] ? BOARD[def.tiles[0] - 1] : null;
  const style = first ? TILE_STYLE[first.type] : { bg: ["#8be86b", "#2fae4a"] };
  // vista previa: tal como sale en el juego, con los huecos rellenados con una partida de ejemplo
  const vars = useMemo(() => sampleVars(def), [def]);
  const preview = (x: string) => fillCard(x, vars);
  return (
    <div className={`flex gap-3 rounded-xl p-3 ${edited ? "bg-amber-400/10 ring-1 ring-amber-400/60" : "bg-white/5"}`}>
      <div className="w-72 shrink-0">
        {/* igual que la tarjeta de la TV */}
        <div className="overflow-hidden rounded-[1.2rem] border-[3px] border-[#1b1f4b] bg-[#fbf3e4] text-[#1b1f4b] shadow-[0_5px_0_#1b1f4b]">
          <div className="flex items-center gap-3 px-3.5 py-2.5" style={{ background: `linear-gradient(160deg, ${style.bg[0]}, ${style.bg[1]})` }}>
            {first && <img src={tileArt(first.type)} alt="" className="h-auto w-14 shrink-0 drop-shadow-[0_3px_0_rgba(0,0,0,.3)]" />}
            <div className="min-w-0">
              <p className="font-display text-[11px] text-white/90">{def.tiles.length ? `Casilla ${def.tiles[0]}` : "Resultado"}</p>
              <h4 className="font-display text-xl leading-tight text-white drop-shadow-[0_2px_0_rgba(0,0,0,.35)]">{preview(title) || "…"}</h4>
            </div>
          </div>
          <p className="px-3.5 py-3 font-display text-[15px] leading-snug whitespace-pre-line">{preview(text) || "…"}</p>
        </div>
        <p className="mt-1.5 text-[11px] opacity-70">
          {def.tiles.length ? `Casilla${def.tiles.length > 1 ? "s" : ""} ${def.tiles.join(", ")}` : "Al tirar el dado"} · así se ve en el juego (con Ana de ejemplo)
        </p>
      </div>
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">{def.label}</span>
          {edited && (
            <button className="ml-auto text-xs text-amber-300 underline" onClick={onReset}>
              Volver al de serie
            </button>
          )}
        </div>
        <input className="rounded-md bg-white/10 px-2 py-1.5 text-sm font-semibold" value={title} maxLength={60} onChange={(e) => onChange("title", e.target.value)} aria-label={`Título de ${def.label}`} />
        <textarea className="min-h-20 rounded-md bg-white/10 px-2 py-1.5 text-sm" value={text} maxLength={600} onChange={(e) => onChange("text", e.target.value)} aria-label={`Texto de ${def.label}`} />
        {def.vars.length > 0 && (
          <p className="text-[11px] opacity-70">
            Huecos:{" "}
            {def.vars.map((v) => (
              <button key={v.name} type="button" title={`Añade {${v.name}} al texto — ${v.about}`} className="mr-1 rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20" onClick={() => onChange("text", `${text}{${v.name}}`)}>
                {`{${v.name}}`}
              </button>
            ))}
            <span className="opacity-80">({def.vars.map((v) => `${v.name}: ${v.about}`).join(" · ")})</span>
          </p>
        )}
      </div>
    </div>
  );
}
