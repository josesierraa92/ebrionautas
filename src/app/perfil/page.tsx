"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Marciano from "@/components/Marciano";
import {
  COSTUMES,
  COSTUME_NAMES,
  EYES,
  MOUTHS,
  PATTERNS,
  SKINS,
  type AvatarConfig,
  type Expression,
} from "@/game/avatar";
import { emptyProfile, titleFor, useProfile, type Profile, type ProfileTraits } from "@/lib/profile";

const PREVIEW_EXPRESSIONS: Expression[] = ["normal", "feliz", "mareado", "triste", "abducido", "chulo", "euforico"];

const YES_NO_TRAITS: { key: keyof ProfileTraits; label: string }[] = [
  { key: "gafas", label: "¿Llevas gafas o lentillas?" },
  { key: "melena_gomina", label: "¿Melena o pelo con gomina?" },
  { key: "tatuaje_piercing", label: "¿Tatuaje o piercing?" },
  { key: "mascota", label: "¿Tienes mascota?" },
  { key: "deportista", label: "¿Gimnasio o deporte?" },
];

export default function PerfilPage() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}

function Editor() {
  const router = useRouter();
  const back = useSearchParams().get("volver");
  const { profile, loaded, update } = useProfile();
  const [draft, setDraft] = useState<Profile | null>(null);
  const [expr, setExpr] = useState(0);

  useEffect(() => {
    if (loaded) setDraft(profile ?? emptyProfile());
  }, [loaded, profile]);

  if (!draft) return null;

  const setAvatar = (patch: Partial<AvatarConfig>) => setDraft({ ...draft, avatar: { ...draft.avatar, ...patch } });
  const setTraits = (patch: Partial<ProfileTraits>) => setDraft({ ...draft, traits: { ...draft.traits, ...patch } });
  const save = () => {
    update({ ...draft, name: draft.name.trim().slice(0, 16) });
    // Solo se vuelve a rutas internas de una mesa.
    router.push(back && /^\/j\/[A-Za-z]{4}$/.test(back) ? back : "/");
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="title-game text-2xl">
          EBRIONAUTAS
        </Link>
        <span className="font-display text-white/70">Mi Ebrionauta</span>
      </div>

      <section className="flex flex-col items-center gap-2 rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
        <button onClick={() => setExpr((expr + 1) % PREVIEW_EXPRESSIONS.length)} aria-label="Probar otra expresión">
          <Marciano avatar={draft.avatar} expression={PREVIEW_EXPRESSIONS[expr]} size={150} />
        </button>
        <p className="text-xs text-white/50">Toca al Marciano para ver sus caras ({PREVIEW_EXPRESSIONS[expr]})</p>
        <input
          value={draft.name}
          maxLength={16}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Tu nombre de Ebrionauta"
          className="w-full rounded-xl border-[3px] border-ink bg-white px-3 py-2 text-center text-xl text-ink outline-none"
        />
        <p className="font-display text-btn-yellow">{titleFor(draft.stats)}</p>
        <div className="grid w-full grid-cols-3 gap-2 text-center">
          <Stat label="Partidas" value={draft.stats.partidas} />
          <Stat label="Victorias" value={draft.stats.victorias} />
          <Stat label="Vasos" value={draft.stats.vasos} />
        </div>
      </section>

      <Group title="Disfraz">
        <div className="grid grid-cols-3 gap-2">
          {COSTUMES.map((c) => (
            <Option key={c} selected={draft.avatar.costume === c} onClick={() => setAvatar({ costume: c })} label={COSTUME_NAMES[c]}>
              <Marciano avatar={{ ...draft.avatar, costume: c }} size={56} />
            </Option>
          ))}
        </div>
      </Group>

      <Group title="Color">
        <div className="grid grid-cols-6 gap-2">
          {SKINS.map((c) => (
            <button
              key={c}
              aria-label={`Color ${c}`}
              aria-pressed={draft.avatar.skin === c}
              onClick={() => setAvatar({ skin: c })}
              className={`aspect-square rounded-full border-[3px] ${draft.avatar.skin === c ? "border-white ring-4 ring-ink" : "border-ink"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Group>

      <Group title="Ojos">
        <div className="grid grid-cols-4 gap-2">
          {EYES.map((e) => (
            <Option key={e} selected={draft.avatar.eyes === e} onClick={() => setAvatar({ eyes: e })} label={e}>
              <Marciano avatar={{ ...draft.avatar, eyes: e }} size={44} />
            </Option>
          ))}
        </div>
      </Group>

      <Group title="Boca">
        <div className="grid grid-cols-4 gap-2">
          {MOUTHS.map((m) => (
            <Option key={m} selected={draft.avatar.mouth === m} onClick={() => setAvatar({ mouth: m })} label={m}>
              <Marciano avatar={{ ...draft.avatar, mouth: m }} size={44} />
            </Option>
          ))}
        </div>
      </Group>

      <Group title="Patrón">
        <div className="grid grid-cols-4 gap-2">
          {PATTERNS.map((p) => (
            <Option key={p} selected={draft.avatar.pattern === p} onClick={() => setAvatar({ pattern: p })} label={p}>
              <Marciano avatar={{ ...draft.avatar, pattern: p }} size={44} />
            </Option>
          ))}
        </div>
      </Group>

      <Group title="Estudio de especímenes humanos (opcional)">
        <p className="mb-2 text-sm text-white/60">
          Si respondes, tu celular vota solo en casillas como &quot;Cegatos&quot; o &quot;Tatuados&quot;. Se guarda solo en este celular.
        </p>
        <div className="flex flex-col gap-2">
          <Row label="Género">
            <Choice
              value={draft.traits.genero}
              options={[
                ["hombre", "Hombre"],
                ["mujer", "Mujer"],
                ["otro", "Otro"],
              ]}
              onChange={(v) => setTraits({ genero: v })}
            />
          </Row>
          <Row label="Año de nacimiento">
            <input
              inputMode="numeric"
              value={draft.traits.anioNacimiento ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, "").slice(0, 4), 10);
                setTraits({ anioNacimiento: Number.isNaN(n) ? undefined : n });
              }}
              placeholder="—"
              className="w-20 rounded-lg border-2 border-ink bg-white px-2 py-1 text-center text-ink outline-none"
            />
          </Row>
          {YES_NO_TRAITS.map(({ key, label }) => (
            <Row key={key} label={label}>
              <Choice
                value={draft.traits[key] === undefined ? undefined : draft.traits[key] ? "si" : "no"}
                options={[
                  ["si", "Sí"],
                  ["no", "No"],
                ]}
                onChange={(v) => setTraits({ [key]: v === undefined ? undefined : v === "si" })}
              />
            </Row>
          ))}
        </div>
      </Group>

      <div className="sticky bottom-3">
        <button onClick={save} className="btn-game w-full bg-btn-green py-4 text-2xl text-white">
          GUARDAR
        </button>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-space py-1">
      <div className="font-display text-xl">{value}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-[3px] border-ink bg-ink/80 p-3">
      <h2 className="mb-2 font-display text-lg">{title}</h2>
      {children}
    </section>
  );
}

function Option({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      aria-pressed={selected}
      onClick={onClick}
      className={`flex flex-col items-center rounded-xl border-[3px] p-1 text-xs capitalize ${selected ? "border-btn-yellow bg-white/15" : "border-ink bg-space/60"}`}
    >
      {children}
      <span className="truncate">{label}</span>
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

/** Botones de opción única; tocar el elegido lo desmarca (= no contestar). */
function Choice<T extends string>({ value, options, onChange }: { value: T | undefined; options: [T, string][]; onChange: (v: T | undefined) => void }) {
  return (
    <div className="flex gap-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          aria-pressed={value === v}
          onClick={() => onChange(value === v ? undefined : v)}
          className={`rounded-lg border-2 border-ink px-2.5 py-1 text-sm font-display ${value === v ? "bg-btn-yellow text-ink" : "bg-space text-white/80"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
