"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import CardPanel, { CardText } from "@/components/CardPanel";
import Controller from "@/components/Controller";
import Logo from "@/components/Logo";
import { api, controlKey, epochKey, saved, useRoom } from "@/lib/room-client";

/** El único celular que controla la mesa: agrega jugadores, tira el dado y decide. */
export default function ControlPage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const { room, error, refresh } = useRoom(code);
  const router = useRouter();
  // una mesa online no tiene «celular de control»: cada jugador entra a la sala desde su aparato
  useEffect(() => {
    if (room?.mode === "online") router.replace(`/mesa/${code}`);
  }, [room?.mode, code, router]);
  const [secret, setSecret] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setSecret(saved.get<string>(controlKey(code)));
    setLoaded(true);
  }, [code]);

  // Si la TV liberó el control, la clave guardada ya no sirve.
  // …o si otro celular lo tomó después (la «época» de la mesa ya no es la que guardamos al tomarlo): sin esto el celular viejo seguía enseñando el juego sin poder jugar.
  const lostEpoch = !!room && !!secret && (() => {
    const mine = saved.get<number>(epochKey(code));
    return mine !== null && room.controlEpoch !== mine;
  })();
  const released = room && secret && (!room.hasController || lostEpoch);
  // el celular que PERDIÓ el control no vuelve a pedirlo solo (si no, al soltarlo la TV le saldría otra vez «¿liberar?»): `asked` evita el aviso automático
  const asked = useRef(false);
  const autoClaim = useRef(false);
  useEffect(() => {
    if (!released) return;
    asked.current = true;
    saved.set(controlKey(code), null);
    setSecret(null);
  }, [released, code]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const claimNow = () =>
    run(async () => {
      const r = await api<{ secret: string; epoch: number }>(`/api/rooms/${code}/control`, {});
      saved.set(controlKey(code), r.secret);
      saved.set(epochKey(code), r.epoch);
      await refresh(); // que la mesa ya diga "con control" antes de usar la clave
      setSecret(r.secret);
    });

  // Otro celular ya controla: se le avisa a la TV (le sale «¿Liberar el control?») y, cuando la libera, este celular entra solo.
  const blocked = loaded && !!room && !secret && room.hasController;
  useEffect(() => {
    if (!blocked || asked.current) return;
    asked.current = true;
    autoClaim.current = true; // y cuando la TV lo libere, entra solo
    api(`/api/rooms/${code}/request`, {}).catch(() => {});
  }, [blocked, code]);
  useEffect(() => {
    if (autoClaim.current && loaded && room && !secret && !room.hasController && !busy) claimNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.hasController, secret, loaded]);

  if (!loaded || !room) {
    return <Shell>{error ? <ErrorBox text={error} /> : <p>Conectando con la mesa {code}…</p>}</Shell>;
  }

  // 1. Tomar el control
  if (!secret) {
    return (
      <Shell>
        <Logo className="w-56" />
        <CardPanel
          inline
          unit="17px"
          width={22}
          kicker={`Mesa ${code}`}
          title="¿Controlas tú el juego?"
          icon="skull"
          actions={
            room.hasController ? (
              <button onClick={() => api(`/api/rooms/${code}/request`, {}).catch(() => {})} className="btn-game bg-btn-yellow px-4 py-3 text-xl text-white">
                PEDIR OTRA VEZ
              </button>
            ) : (
              <button disabled={busy} onClick={claimNow} className="btn-game w-full bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey">
                CONTROLAR LA MESA
              </button>
            )
          }
        >
          <CardText>Desde este celular se agregan los jugadores, se tira el dado y se decide todo. El tablero se ve en la TV.</CardText>
          {room.hasController && <div style={{ marginTop: 10 }}><ErrorBox text="Otro celular controla la mesa. Ya le avisamos a la TV: pulsa «LIBERAR» ahí y entras solo." /></div>}
          {actionError && <div style={{ marginTop: 10 }}><ErrorBox text={actionError} /></div>}
        </CardPanel>
      </Shell>
    );
  }

  // 2 y 3. Jugadores y partida: el control compartido con el modo «un solo aparato»
  return <Controller code={code} room={room} secret={secret} error={error} refresh={refresh} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 py-10 text-center">{children}</main>;
}

function ErrorBox({ text }: { text: string }) {
  return <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white">{text}</p>;
}
