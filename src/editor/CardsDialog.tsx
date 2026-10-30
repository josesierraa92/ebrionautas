"use client";

// Ventana para ver y cambiar el texto de TODAS las tarjetas del juego (la que sale en la TV y en el celular al caer en
// una casilla). Las casillas que comparten tarjeta (p. ej. las 6 «Ronda de mezcal») se muestran una sola vez, con los
// números de casilla que la usan. Se guardan aparte del tablero y valen para todas las mesas (`/api/admin/cards`).
import { useEffect, useMemo, useState, useRef } from "react";
import { CARD_GROUPS, cardCatalog, fillCard, groupOf, parseCardOverrides, RESULT_KEYS, type CardDef, type CardOverrides } from "@/game/cards";
import { createGame } from "@/game/engine";
import { staticCardVars, tileVars } from "@/game/rules";
import { fetchCardTexts } from "@/lib/useCardTexts";
import { TILE_ACCENT } from "@/game/tileStyle";
import { DEFAULT_ICON } from "@/editor/icons";
import GameCard from "@/components/GameCard";
import { BOARD } from "@/game/board";
import { DEFAULT_CATEGORIES, DEFAULT_JUICIO, DEFAULT_NICKNAMES, DEFAULT_NUNCA, DEFAULT_REFLEJOS, DEFAULT_RETOS, DEFAULT_RONDA, recoverRetos, DEFAULT_TWISTERS, getLists, parseCategories, parseJuicio, parseNicknames, parseNunca, parseReflejos, parseRetos, parseRonda, parseTwisters, type ContentLists } from "@/game/content";

const CARDS = cardCatalog();

/** Con qué se rellenan los huecos en la vista previa: una partida de ejemplo (Ana juega; Beto va detrás y Carla delante). */
function sampleVars(def: CardDef): Record<string, string | number> {
  if (def.key === RESULT_KEYS.duel) return { resultado: "Ana 5 – Beto 2: bebe Beto." };
  if (def.key === RESULT_KEYS.jailRoll) return { nombre: "Ana", dado: 5, vasos: "4 vasos" };
  if (def.key === RESULT_KEYS.jailDebt) return { nombre: "Ana", vasos: "3 vasos" };
  if (def.key === RESULT_KEYS.jailOwes) return { nombre: "Ana", pagados: "1 vaso", deuda: "3 vasos" };
  if (def.key === RESULT_KEYS.jail) return { nombre: "Ana", pagados: "3 vasos", vasos: "3 vasos", dado: 5 };
  if (def.tiles.length === 0) return { nombre: "Ana", dado: 3 };
  const n = def.tiles[0];
  const game = createGame([
    { name: "Ana", color: "#00ff88", gender: "mujer" },
    { name: "Beto", color: "#4488ff", gender: "hombre" },
    { name: "Carla", color: "#ff66aa", gender: "mujer" },
  ]);
  game.players[0].pos = n;
  game.giftAmount = 2; // trago de regalo: de ejemplo, 2 vasos
  game.category = "frutas"; // La Ouija: categoría de ejemplo
  game.nickname = "Pelón"; // Nuevo apodo: apodo de ejemplo
  game.reto = "Quien haya ido al baño bebe."; // Reto del Más Allá: ejemplo
  game.reflejo = "Todos los que lleven un reloj puesto beben."; // Muerte Súbita: ejemplo
  game.nunca = "Yo nunca me he quedado dormido en el cine."; // Yo nunca: frase de ejemplo
  game.juicio = "Todos los que usen Android beben."; // Juicio de los vivos: carta de ejemplo
  game.ronda = { text: "Nadie puede señalar con el dedo.", by: "p1" }; // Reto de ronda: ejemplo
  game.players[1].pos = Math.max(1, n - 3);
  game.players[2].pos = n + 3;
  return { ...tileVars(n, game, game.players[0].id), categoria: "Animales" };
}

const LIST_BOXES: { kind: keyof ContentLists; title: string; unit: string; about: string; defaults: string[]; placeholder: string; max: number }[] = [
  { kind: "categories", title: "🔮 Categorías de La Ouija", unit: "categorías", about: "en cada Ouija sale una al azar y aparece en la tarjeta", defaults: DEFAULT_CATEGORIES, placeholder: "Una categoría por línea (por ejemplo: frutas)", max: 60 },
  { kind: "nicknames", title: "🏷️ Apodos de «Nuevo apodo»", unit: "apodos", about: "al caer en la casilla 14 sale uno al azar donde dice {apodo}", defaults: DEFAULT_NICKNAMES, placeholder: "Un apodo por línea (por ejemplo: Chorizo)", max: 30 },
  { kind: "juicio", title: "👁️ Cartas de Juicio de los vivos", unit: "cartas", about: "cada vez que alguien cae en un ojito sale una al azar", defaults: DEFAULT_JUICIO, placeholder: "Una carta por línea (por ejemplo: Todos los solteros beben.)", max: 200 },
  { kind: "retos", title: "🎤 Retos del Más Allá", unit: "retos", about: "cada vez sale uno al azar; «{trabalenguas}» pone uno de la lista de abajo y «bebe N vasos» fija los vasos", defaults: DEFAULT_RETOS, placeholder: "Un reto por línea (por ejemplo: Quien haya ido al baño bebe 2 vasos.)", max: 240 },
  { kind: "reflejos", title: "⏱️ Cartas de Muerte Súbita", unit: "cartas", about: "al caer sale una al azar (la última persona en…, todos los que lleven…)", defaults: DEFAULT_REFLEJOS, placeholder: "Una carta por línea (por ejemplo: Todos los que lleven un anillo beben.)", max: 200 },
  { kind: "ronda", title: "⏳ Retos de ronda", unit: "retos", about: "al caer en «Reto de ronda» sale uno al azar y dura toda la ronda", defaults: DEFAULT_RONDA, placeholder: "Un reto por línea (por ejemplo: Nadie puede señalar con el dedo.)", max: 200 },
  { kind: "nunca", title: "🤚 Frases de «Yo nunca»", unit: "frases", about: "al caer en Yo nunca sale una al azar; beben los que sí lo hayan hecho", defaults: DEFAULT_NUNCA, placeholder: "Una frase por línea (por ejemplo: Yo nunca he …)", max: 200 },
  { kind: "twisters", title: "👅 Trabalenguas de Lenguados", unit: "trabalenguas", about: "al caer en Lenguados sale uno al azar y se añade a la tarjeta", defaults: DEFAULT_TWISTERS, placeholder: "Un trabalenguas por línea", max: 240 },
];

export default function CardsDialog({ adminKey, onClose, onStatus: reportStatus }: { adminKey: () => string; onClose: () => void; onStatus: (msg: string) => void }) {
  // los avisos salen también DENTRO del diálogo: la barra de estado del editor queda detrás del fondo oscuro y no se veía
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const onStatus = (msg: string) => {
    setNote({ text: msg, bad: /no se pud|no encontr|error|falta/i.test(msg) });
    reportStatus(msg);
  };
  const [saved, setSaved] = useState<CardOverrides | null>(null);
  const [draft, setDraft] = useState<CardOverrides>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  // listas editables (una por línea): categorías de La Ouija, trabalenguas de Lenguados y apodos de «Nuevo apodo»
  const [listsText, setListsText] = useState<Record<keyof ContentLists, string>>({ categories: "", twisters: "", nicknames: "", nunca: "", juicio: "", ronda: "", retos: "", reflejos: "" });
  const [savedLists, setSavedLists] = useState<ContentLists | null>(null);
  const showLists = (l: ContentLists) => (setSavedLists(l), setListsText({ categories: l.categories.join("\n"), twisters: l.twisters.join("\n"), nicknames: l.nicknames.join("\n"), nunca: l.nunca.join("\n"), juicio: l.juicio.join("\n"), ronda: l.ronda.join("\n"), retos: l.retos.join("\n"), reflejos: l.reflejos.join("\n") }));

  useEffect(() => {
    void fetchCardTexts(true).then((o) => {
      setSaved(o);
      setDraft(o);
      showLists(getLists());
    });
  }, []);
  const lists = useMemo<ContentLists>(
    () => ({
      categories: parseCategories(listsText.categories.split("\n")),
      twisters: parseTwisters(listsText.twisters.split("\n")),
      nicknames: parseNicknames(listsText.nicknames.split("\n")),
      nunca: parseNunca(listsText.nunca.split("\n")),
      juicio: parseJuicio(listsText.juicio.split("\n")),
      ronda: parseRonda(listsText.ronda.split("\n")),
      retos: parseRetos(listsText.retos.split("\n")),
      reflejos: parseReflejos(listsText.reflejos.split("\n")),
    }),
    [listsText],
  );

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CARDS;
    return CARDS.filter((c) => `${c.label} ${c.defaults.title} ${draft[c.key]?.title ?? ""} ${c.defaults.text} ${draft[c.key]?.text ?? ""} ${c.tiles.join(" ")}`.toLowerCase().includes(q));
  }, [search, draft]);

  // las tarjetas ordenadas por grupo (solo los que tienen alguna que coincida con la búsqueda)
  const groups = useMemo(
    () =>
      CARD_GROUPS.map((g) => {
        const cards = list.filter((c) => groupOf(c) === g.id);
        return { ...g, cards, tiles: cards.reduce((n, c) => n + c.tiles.length, 0) };
      }).filter((g) => g.cards.length),
    [list],
  );
  // Antes de agrupar los retos, cada uno tenía su tarjeta con el texto que el admin pudo cambiar: se piden al servidor y se ponen en la lista
  const recoverOldRetos = async () => {
    try {
      const res = await fetch("/api/admin/cards", { headers: { "x-admin-key": adminKey() }, cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return onStatus(body.error ?? "No se pudieron pedir los retos anteriores.");
      const legacy = (body.retos ?? []) as { title: string; text: string }[];
      if (!legacy.length) return onStatus("No encontré retos guardados de antes de agruparlos.");
      setListsText((t) => ({ ...t, retos: recoverRetos(t.retos.split("\n"), legacy).join("\n") }));
      onStatus(`Recuperé ${legacy.length} reto(s) de antes. Revisa la lista y pulsa «Guardar».`);
    } catch {
      onStatus("No se pudieron pedir los retos anteriores (¿sin conexión?).");
    }
  };

  // cartas de serie que no están en la lista (las borró el admin, o se guardó una lista mala): se enseñan y se pueden recuperar con un clic
  const lineKey = (x: string) => x.replace(/\s+/g, " ").trim().toLowerCase();
  const missingOf = (box: (typeof LIST_BOXES)[number]) => {
    if (!savedLists) return []; // todavía cargando
    const have = new Set(listsText[box.kind].split("\n").map(lineKey));
    return box.defaults.filter((d) => !have.has(lineKey(d)));
  };
  const restoreMissing = (box: (typeof LIST_BOXES)[number]) => {
    const missing = missingOf(box);
    setListsText((t) => ({ ...t, [box.kind]: [...t[box.kind].split("\n").filter((l) => l.trim()), ...missing].join("\n") }));
    onStatus(`Recuperé ${missing.length} carta(s) de serie en «${box.title.replace(/^\S+\s/, "")}». Pulsa «Guardar» para dejarlas.`);
  };

  const changed = saved !== null && (JSON.stringify(parseCardOverrides(draft)) !== JSON.stringify(saved) || JSON.stringify(lists) !== JSON.stringify(savedLists));
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
      const res = await fetch("/api/admin/cards", { method: "PUT", headers: { "content-type": "application/json", "x-admin-key": adminKey() }, body: JSON.stringify({ cards: parseCardOverrides(draft), ...lists }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return onStatus(body.error ?? "No se pudieron guardar las tarjetas.");
      const o = parseCardOverrides(body.cards);
      setSaved(o);
      setDraft(o);
      showLists({ categories: parseCategories(body.categories ?? lists.categories), twisters: parseTwisters(body.twisters ?? lists.twisters), nicknames: parseNicknames(body.nicknames ?? lists.nicknames), nunca: parseNunca(body.nunca ?? lists.nunca), juicio: parseJuicio(body.juicio ?? lists.juicio), ronda: parseRonda(body.ronda ?? lists.ronda), retos: parseRetos(body.retos ?? lists.retos), reflejos: parseReflejos(body.reflejos ?? lists.reflejos) });
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

  // Cerrar: con cambios sin guardar se pregunta; y un clic en el fondo solo cierra si empezó Y terminó en el fondo (arrastrar para seleccionar
  // texto y soltar fuera del panel cerraba el diálogo «de la nada» y se perdía lo escrito).
  const downOnBackdrop = useRef(false);
  const requestClose = () => {
    if (changed && !confirm("Tienes cambios sin guardar. ¿Cerrar sin guardar?")) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"
      onMouseDown={(e) => (downOnBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => {
        const fromBackdrop = downOnBackdrop.current && e.target === e.currentTarget;
        downOnBackdrop.current = false;
        if (fromBackdrop) requestClose();
      }}
    >
      <div className="flex max-h-full w-full max-w-4xl flex-col gap-3 overflow-hidden rounded-2xl bg-[#1c1f27] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl text-amber-400">📝 Tarjetas del juego</h2>
          <input placeholder="Buscar una tarjeta o un número de casilla…" className="ml-auto w-72 rounded-md bg-white/10 px-2 py-1 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className={`${btn} bg-emerald-500 text-black ${changed && !busy ? "" : "opacity-40"}`} disabled={!changed || busy} onClick={save}>
            {busy ? "Guardando…" : "💾 Guardar"}
          </button>
          <button className={`${btn} ${off}`} onClick={requestClose}>
            Cerrar
          </button>
        </div>
        {note && (
          <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${note.bad ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"}`} role="status">
            <span className="flex-1">{note.text}</span>
            <button className="opacity-70 hover:opacity-100" onClick={() => setNote(null)} aria-label="Quitar aviso">
              ✕
            </button>
          </div>
        )}
        <p className="text-sm opacity-70">
          Aquí está cada tarjeta una sola vez (las casillas que comparten tarjeta salen juntas). Edita el título y el texto como quieras: es el
          mismo texto que sale en el juego. Lo único que va entre llaves, como <code className="rounded bg-white/10 px-1">{"{nombre}"}</code>,
          es lo que cambia en cada partida (el jugador, la casilla…): déjalo tal cual para que el juego lo rellene.
          {saved === null && " Cargando…"}
        </p>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {!search.trim() &&
            LIST_BOXES.map((box) => (
              <div key={box.kind} className="grid gap-1.5 rounded-xl bg-white/5 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">{box.title}</span>
                  <span className="text-xs opacity-70">
                    {lists[box.kind].length} {box.unit} · {box.about}
                  </span>
                  {missingOf(box).length > 0 && (
                    <button className="ml-auto rounded-md bg-amber-400/20 px-2 py-0.5 text-xs text-amber-200 hover:bg-amber-400/30" onClick={() => restoreMissing(box)} title={missingOf(box).join("\n")}>
                      ♻️ Faltan {missingOf(box).length} de serie · recuperar
                    </button>
                  )}
                  {box.kind === "retos" && (
                    <button className={`${missingOf(box).length ? "" : "ml-auto "}text-xs text-emerald-300 underline`} onClick={recoverOldRetos}>
                      ♻️ Recuperar mis retos de antes
                    </button>
                  )}
                  <button className={`${box.kind === "retos" || missingOf(box).length ? "" : "ml-auto "}text-xs text-amber-300 underline`} onClick={() => setListsText((t) => ({ ...t, [box.kind]: box.defaults.join("\n") }))}>
                    Volver a las de serie
                  </button>
                </div>
                <textarea
                  className="min-h-40 rounded-md bg-white/10 px-2 py-1.5 text-sm"
                  rows={8}
                  value={listsText[box.kind]}
                  onChange={(e) => setListsText((t) => ({ ...t, [box.kind]: e.target.value }))}
                  placeholder={box.placeholder}
                  aria-label={box.title}
                />
                <p className="text-[11px] opacity-70">Una por línea: cambia, borra o añade las que quieras (se guardan con «Guardar»). Máximo {box.max} letras cada una.</p>
              </div>
            ))}
          {/* resumen: cuántas tarjetas distintas hay y cuántas casillas cubre cada grupo (tocar un grupo salta a él) */}
          {!search.trim() && (
            <div className="grid gap-2 rounded-xl bg-white/5 p-3">
              <p className="text-sm">
                <b>{BOARD.length} casillas</b> en el tablero · <b>{CARDS.filter((c) => c.tiles.length).length} tarjetas distintas</b> (las que se repiten comparten texto) + {CARDS.filter((c) => !c.tiles.length).length} de resultado
              </p>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <a key={g.id} href={`#grupo-${g.id}`} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20" onClick={(e) => { e.preventDefault(); document.getElementById(`grupo-${g.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                    <b>{g.title}</b> · {g.cards.length} {g.cards.length === 1 ? "tarjeta" : "tarjetas"}
                    {g.tiles > 0 && ` · ${g.tiles} ${g.tiles === 1 ? "casilla" : "casillas"}`}
                  </a>
                ))}
              </div>
            </div>
          )}
          {groups.map((g) => (
            <section key={g.id} id={`grupo-${g.id}`} className="grid gap-3 scroll-mt-2">
              <div className="sticky top-0 z-10 -mx-1 rounded-lg bg-[#1c1f27]/95 px-1 py-1.5 backdrop-blur">
                <h3 className="font-display text-lg text-amber-300">
                  {g.title} <span className="text-sm text-white/60">· {g.cards.length} {g.cards.length === 1 ? "tarjeta" : "tarjetas"}{g.tiles > 0 && ` · ${g.tiles} ${g.tiles === 1 ? "casilla" : "casillas"}`}</span>
                </h3>
                <p className="text-xs opacity-60">{g.about}</p>
              </div>
              {g.cards.map((c) => (
                <CardEditor key={c.key} def={c} value={draft[c.key]} onChange={(f, v) => set(c.key, f, v)} onReset={() => reset(c.key)} />
              ))}
            </section>
          ))}
          {list.length === 0 && <p className="py-8 text-center text-sm opacity-60">Ninguna tarjeta coincide.</p>}
        </div>
      </div>
    </div>
  );
}

function CardEditor({ def, value, onChange, onReset }: { def: CardDef; value: { title?: string; text?: string } | undefined; onChange: (f: "title" | "text", v: string) => void; onReset: () => void }) {
  // Los datos que siempre valen lo mismo en esta tarjeta («1 vaso», «los hombres», «2 vasos») se enseñan ya escritos, como texto normal.
  // Los que cambian en cada partida o según la casilla ({nombre}, {casilla}…) se quedan entre llaves para no romper la lógica del juego.
  const vars = useMemo(() => sampleVars(def), [def]);
  const fixed = useMemo(() => staticCardVars(def), [def]);
  const fillFixed = (x: string) => fillCard(x, fixed);
  const dynamicVars = def.vars.filter((v) => !(v.name in fixed));
  const title = value?.title ?? def.defaults.title;
  const text = fillFixed(value?.text ?? def.defaults.text);
  // si el texto vuelve a ser igual al de serie no cuenta como edición
  const changeText = (v: string) => onChange("text", v === fillFixed(def.defaults.text) ? def.defaults.text : v);
  const edited = (value?.title !== undefined && value.title !== def.defaults.title) || (value?.text !== undefined && value.text !== def.defaults.text);
  // casilla de la que toma icono y color: la primera que usa la tarjeta (el resultado del duelo, la de duelo)
  // los resultados llevan el icono (negro, vectorial) de su casilla: duelo y purgatorio (cárcel)
  const resultTile = def.key === RESULT_KEYS.duel ? "DUELO" : def.key.startsWith("RESULTADO:purgatorio") ? "CARCEL" : null;
  // el tipo se toma directamente (no de una casilla del tablero: si un tipo se queda sin casillas el icono no se pierde)
  const first = def.tiles[0] ? BOARD[def.tiles[0] - 1] : null;
  const type = first?.type ?? resultTile;
  const accent = type ? TILE_ACCENT[type] : "#ffc61a";
  const icon = type ? DEFAULT_ICON[type] : null;
  const emoji = type ? undefined : def.key === RESULT_KEYS.jail ? "🔓" : "🍷";
  const kind = first && (first.type === "RASGO" ? "Carta al azar" : first.type === "RETO" ? "Reto" : null);
  // vista previa: tal como sale en el juego, con los huecos rellenados con una partida de ejemplo
  const preview = (x: string) => fillCard(x, vars);
  return (
    <div className={`flex gap-3 rounded-xl p-3 ${edited ? "bg-amber-400/10 ring-1 ring-amber-400/60" : "bg-white/5"}`}>
      <div className="w-72 shrink-0">
        {/* la misma tarjeta que sale en la TV y en el celular (GameCard): si cambia su diseño, cambia aquí */}
        <GameCard accent={accent} icon={icon} emoji={emoji} kicker={def.tiles.length ? `Casilla ${def.tiles[0]}` : "Resultado"} title={preview(title) || "…"} text={preview(text) || "…"} unit="12px" cardKey={0} />
        <p className="mt-1.5 text-[11px] opacity-70">
          {def.tiles.length ? `Casilla${def.tiles.length > 1 ? "s" : ""} ${def.tiles.join(", ")}` : "Al tirar el dado"} · así se ve en el juego (con Ana de ejemplo)
        </p>
      </div>
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">{def.label}</span>
          {kind && <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs opacity-80">{kind}</span>}
          {def.tiles.length > 0 && (
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${def.tiles.length > 1 ? "bg-amber-400/25 text-amber-200" : "bg-emerald-400/20 text-emerald-200"}`} title={`Casillas: ${def.tiles.join(", ")}`}>
              {def.tiles.length > 1 ? `Se repite ×${def.tiles.length}` : "Solo 1 casilla"}
            </span>
          )}
          {edited && (
            <button className="ml-auto text-xs text-amber-300 underline" onClick={onReset}>
              Volver al de serie
            </button>
          )}
        </div>
        <input className="rounded-md bg-white/10 px-2 py-1.5 text-sm font-semibold" value={title} maxLength={60} onChange={(e) => onChange("title", e.target.value)} aria-label={`Título de ${def.label}`} />
        <textarea className="min-h-20 rounded-md bg-white/10 px-2 py-1.5 text-sm" value={text} maxLength={600} onChange={(e) => changeText(e.target.value)} aria-label={`Texto de ${def.label}`} />
        {dynamicVars.length > 0 && (
          <p className="text-[11px] opacity-70">
            Cambian en cada partida (toca uno para añadirlo al texto):{" "}
            {dynamicVars.map((v) => (
              <button key={v.name} type="button" title={v.about} className="mr-1 rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20" onClick={() => changeText(`${text}{${v.name}}`)}>
                {`{${v.name}}`}
              </button>
            ))}
            <span className="opacity-80">({dynamicVars.map((v) => `${v.name}: ${v.about}`).join(" · ")})</span>
          </p>
        )}
      </div>
    </div>
  );
}
