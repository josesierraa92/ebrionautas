"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, hostKey, saved } from "@/lib/room-client";

export default function HomeActions() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const room = await api<{ code: string; hostSecret: string }>("/api/rooms", {});
      saved.set(hostKey(room.code), room.hostSecret);
      router.push(`/mesa/${room.code}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const clean = code.trim().toUpperCase();

  return (
    // En horizontal (TV): los tres accesos en una fila; en vertical (celular): uno debajo de otro
    <div className="flex w-full flex-col gap-4 landscape:grid landscape:grid-cols-3 landscape:items-start landscape:gap-4">
      <div className="flex flex-col gap-2">
        <button disabled={busy} onClick={create} className="btn-game bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey landscape:py-3">
          {busy ? "CREANDO…" : "CREAR MESA"}
        </button>
        <p className="text-sm text-white/70">Ábrelo en la TV o el portátil: ahí se verá el tablero.</p>
      </div>

      <div className="flex flex-col gap-2">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (clean.length === 4) router.push(`/c/${clean}`);
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 4))}
            placeholder="CÓDIGO"
            aria-label="Código de la mesa"
            autoCapitalize="characters"
            className="w-32 min-w-0 rounded-2xl border-[3px] border-ink bg-white px-3 text-center font-display text-2xl tracking-widest text-ink uppercase outline-none"
          />
          <button disabled={clean.length !== 4} className="btn-game flex-1 bg-btn-blue py-3 text-xl text-white disabled:bg-btn-grey">
            CONTROLAR
          </button>
        </form>
        <p className="text-sm text-white/70">En el celular: pon el código que sale en la TV (o escanea el QR).</p>
      </div>

      <div className="flex flex-col gap-2">
        <Link href="/jugar" className="btn-game bg-btn-yellow py-3 text-lg text-white landscape:py-3">
          JUGAR SIN TV
        </Link>
        <p className="text-sm text-white/70">Todos en un mismo celular, sin TV.</p>
      </div>
      {error && <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white landscape:col-span-3">{error}</p>}
    </div>
  );
}
