"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CardPanel, { CardText } from "@/components/CardPanel";
import { api, hostKey, saved } from "@/lib/room-client";
import type { PublicRoom, RoomMode } from "@/server/rooms";

/**
 * Inicio: dos caminos. CREAR MESA pregunta si es **local** (un anfitrión maneja la partida: solo con la pantalla, o con la pantalla y un celular que
 * tira el dado) u **online** (cada jugador entra con su aparato a una sala de espera y el anfitrión empieza). UNIRSE A MESA pide el código:
 * en una mesa local abre el control del celular; en una online, la sala.
 */
export default function HomeActions() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (mode: RoomMode) => {
    setBusy(true);
    setError(null);
    try {
      const room = await api<{ code: string; hostSecret: string }>("/api/rooms", { mode });
      saved.set(hostKey(room.code), room.hostSecret);
      // Local desde un celular: no tiene sentido enseñar el QR para «conectar otro celular»; se juega directo en este mismo celular
      const phone = mode === "local" && window.matchMedia("(pointer: coarse) and (max-width: 900px)").matches;
      router.push(`/mesa/${room.code}${phone ? "?solo=1" : ""}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setChoosing(false);
    }
  };

  const clean = code.trim().toUpperCase();
  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clean.length !== 4) return;
    setBusy(true);
    setError(null);
    try {
      const room = await api<PublicRoom>(`/api/rooms/${clean}`);
      router.push(room.mode === "online" ? `/mesa/${clean}` : `/c/${clean}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    // En horizontal (TV, PC): los dos accesos en una fila; en vertical (celular): uno debajo del otro
    <div className="flex w-full flex-col gap-4 landscape:grid landscape:grid-cols-2 landscape:items-start landscape:gap-6">
      <div className="flex flex-col gap-2">
        <button disabled={busy} onClick={() => setChoosing(true)} className="btn-game bg-btn-green py-4 text-3xl text-white disabled:bg-btn-grey landscape:py-3">
          CREAR MESA
        </button>
        <p className="text-sm text-white/70 portrait:[@media(max-height:720px)]:hidden">Tú eres el anfitrión: juegan todos juntos o cada uno desde su dispositivo.</p>
      </div>

      <div className="flex flex-col gap-2">
        <form className="flex gap-2" onSubmit={join}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 4))}
            placeholder="CÓDIGO"
            aria-label="Código de la mesa"
            autoCapitalize="characters"
            className="w-32 min-w-0 rounded-2xl border-[3px] border-ink bg-white px-3 text-center font-display text-2xl tracking-widest text-ink uppercase outline-none"
          />
          <button disabled={busy || clean.length !== 4} className="btn-game flex-1 bg-btn-blue py-3 text-2xl text-white disabled:bg-btn-grey">
            UNIRSE A MESA
          </button>
        </form>
        <p className="text-sm text-white/70 portrait:[@media(max-height:720px)]:hidden">Pon el código de cuatro letras que te dio el anfitrión (o escanea su QR).</p>
      </div>
      {error && <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white landscape:col-span-2">{error}</p>}

      {choosing && (
        <CardPanel kicker="Crear mesa" title="¿Cómo van a jugar?" centerTitle unit="17px" width={24} onClose={() => !busy && setChoosing(false)}>
          <div className="flex flex-col" style={{ gap: "1rem" }}>
            <div className="flex flex-col gap-2 rounded-2xl bg-white/10 p-3">
              <button disabled={busy} onClick={() => create("local")} className="btn-game w-full bg-btn-green py-3 text-3xl text-white disabled:bg-btn-grey">
                LOCAL
              </button>
              <CardText size={0.95}>Todos juntos en un mismo lugar. Tú manejas la partida desde esta pantalla, o conectas un celular para tirar el dado.</CardText>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-white/10 p-3">
              <button disabled={busy} onClick={() => create("online")} className="btn-game w-full bg-btn-blue py-3 text-3xl text-white disabled:bg-btn-grey">
                ONLINE
              </button>
              <CardText size={0.95}>Cada jugador entra desde su dispositivo con el código y tú das «¡A levantarse!».</CardText>
            </div>
          </div>
        </CardPanel>
      )}
    </div>
  );
}
