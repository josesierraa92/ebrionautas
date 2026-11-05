"use client";

// Sala de espera de una mesa online: cada jugador entra con su aparato (nombre + hombre/mujer), todos ven quién ya está y el anfitrión
// da «¡A levantarse!» cuando estén todos. Usa el diseño de las tarjetas (`CardPanel`).
import RoomBackdrop from "@/components/RoomBackdrop";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import CardPanel, { CardText, GREEN } from "@/components/CardPanel";
import Logo from "@/components/Logo";
import TrophyIcon from "@/components/TrophyIcon";
import { api, memberKey, saved, type SavedMember } from "@/lib/room-client";
import type { PublicRoom } from "@/server/rooms";

const UNIT = "max(min(1.3vw, 1.8vh), min(2.5vw, 1.2vh))"; // TV: manda la primera; celular vertical: la segunda
const c = (k: number) => `calc(var(--u) * ${k})`;

type Props = {
  code: string;
  room: PublicRoom;
  /** Clave de creador de este aparato (si creó la mesa: entra como anfitrión). */
  hostSecret: string | null;
  member: SavedMember | null;
  onMember: (m: SavedMember | null) => void;
  refresh: () => Promise<void>;
};

export default function OnlineLobby({ code, room, hostSecret, member, onMember, refresh }: Props) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"hombre" | "mujer" | null>(null);
  const [cups, setCups] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  useEffect(() => setInviteUrl(`${window.location.origin}/mesa/${code}`), [code]);

  const me = member ? room.members.find((m) => m.id === member.id) : undefined;
  const isHost = !!me?.host;

  // si te sacaron de la sala (o se reinició), se suelta la clave vieja y vuelves al formulario
  useEffect(() => {
    if (member && !me && room.members.length >= 0) {
      saved.set(memberKey(code), null);
      onMember(null);
    }
  }, [member, me, code, onMember, room.members.length]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const enter = () =>
    run(async () => {
      const r = await api<{ secret: string; id: string }>(`/api/rooms/${code}/join`, { name, gender, ...(hostSecret ? { hostSecret } : {}) });
      saved.set(memberKey(code), r);
      await refresh(); // primero la sala con tu nombre y después tu clave: si no, se tomaría por «te sacaron»
      onMember(r);
    });
  const leave = (memberId?: string) =>
    run(async () => {
      await api(`/api/rooms/${code}/join`, { secret: member!.secret, ...(memberId ? { memberId } : {}) }, "DELETE");
      if (!memberId) {
        saved.set(memberKey(code), null);
        onMember(null);
      }
    });
  const start = () => run(() => api(`/api/rooms/${code}/start`, { secret: member!.secret, cups }));

  const full = room.members.length >= 16;
  const btn = (extra: string) => `btn-game ${extra} text-white disabled:bg-btn-grey`;
  const bigBtn = { fontSize: c(1.9), padding: `${c(0.7)} ${c(1)}` };

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center gap-5 px-4 py-8 text-center">
      <RoomBackdrop />
      <Link href="/" aria-label="Muertos de Sed" className="block w-[min(30rem,64vw)]">
        <Logo className="w-full" />
      </Link>

      {!me ? (
        <CardPanel inline unit={UNIT} width={30} kicker={`Mesa ${code}`} title={hostSecret ? "Eres el anfitrión" : "Únete a la mesa"} centerTitle>
          <CardText size={1.15}>{hostSecret ? "Ponte nombre para entrar a tu sala; los demás se unirán con el código." : "Escribe tu nombre y elige tu personaje."}</CardText>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 10))}
            placeholder="TU NOMBRE"
            aria-label="Tu nombre"
            className="w-full rounded-2xl border-[3px] border-ink bg-white text-center font-display uppercase text-ink outline-none"
            style={{ marginTop: c(1.1), fontSize: c(2.2), padding: `${c(0.6)} ${c(0.8)}` }}
          />
          <div className="grid grid-cols-2" style={{ gap: c(0.8), marginTop: c(0.9) }}>
            {(["hombre", "mujer"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                aria-pressed={gender === g}
                className="btn-game uppercase"
                style={{ ...bigBtn, fontSize: c(1.7), background: gender === g ? GREEN : "#5b4a9b", color: gender === g ? "#14260a" : "#fff" }}
              >
                {g}
              </button>
            ))}
          </div>
          {error && <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white" style={{ marginTop: c(0.9), fontSize: c(1.1) }}>{error}</p>}
          <button disabled={busy || !name.trim() || !gender || full} onClick={enter} className={`${btn("w-full bg-btn-green")}`} style={{ ...bigBtn, marginTop: c(1.1) }}>
            {full ? "SALA LLENA" : busy ? "ENTRANDO…" : "ENTRAR"}
          </button>
        </CardPanel>
      ) : (
        <CardPanel inline unit={UNIT} width={34} kicker={`Mesa ${code}`} title="Sala de espera" centerTitle>
          <div className="flex items-center justify-center" style={{ gap: c(1.4), marginTop: c(0.4) }}>
            {inviteUrl && (
              <div className="shrink-0 bg-white" style={{ width: c(7), padding: c(0.5), borderRadius: c(0.8) }}>
                <QRCodeSVG value={inviteUrl} size={256} style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            )}
            <div className="grid place-items-center font-display" style={{ minWidth: c(9), padding: `${c(0.6)} ${c(1)}`, borderRadius: c(0.9), background: GREEN, color: "#14260a", fontSize: c(3.6), letterSpacing: "0.12em", lineHeight: 1, paddingLeft: c(1.4) }}>
              {code}
            </div>
          </div>
          <CardText size={1}>Que los demás entren con el código o el QR.</CardText>

          <ul className="flex flex-col" style={{ gap: c(0.6), marginTop: c(1) }} aria-label="Jugadores en la sala">
            {room.members.map((m) => (
              <li key={m.id} className="flex items-center rounded-2xl bg-white/10" style={{ gap: c(0.8), padding: `${c(0.5)} ${c(0.9)}` }}>
                <span className="min-w-0 flex-1 truncate text-left font-display uppercase text-white" style={{ fontSize: c(2) }}>
                  {m.name}
                  {m.id === me.id && <span style={{ color: "#bffa58", fontSize: c(1.1), marginLeft: c(0.6) }}>(TÚ)</span>}
                </span>
                {m.host && (
                  <span className="rounded-full font-display uppercase" style={{ background: GREEN, color: "#14260a", fontSize: c(1), padding: `${c(0.15)} ${c(0.7)}` }}>
                    Anfitrión
                  </span>
                )}
                {isHost && !m.host && (
                  <button disabled={busy} onClick={() => leave(m.id)} aria-label={`Sacar a ${m.name}`} className="btn-game grid place-items-center bg-btn-grey text-white" style={{ width: c(2.6), height: c(2.6), fontSize: c(1.4) }}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>

          {isHost ? (
            <>
              <p className="font-display uppercase" style={{ color: "#bffa58", fontSize: c(1.3), marginTop: c(1.1) }}>¿Cuántas copas?</p>
              <div className="grid grid-cols-3" style={{ gap: c(0.6), marginTop: c(0.4) }}>
                {[1, 2, 3].map((n) => (
                  <button key={n} onClick={() => setCups(n)} aria-pressed={cups === n} className="btn-game flex items-center justify-center" style={{ padding: `${c(0.5)} 0`, gap: c(0.3), background: cups === n ? GREEN : "#5b4a9b" }}>
                    <span className="font-display" style={{ fontSize: c(1.9), color: cups === n ? "#14260a" : "#fff" }}>{n}</span>
                    <TrophyIcon style={{ width: c(1.8), height: c(1.8) }} />
                  </button>
                ))}
              </div>
              {error && <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white" style={{ marginTop: c(0.9), fontSize: c(1.1) }}>{error}</p>}
              <button disabled={busy || room.members.length < 2} onClick={start} className={btn("w-full bg-btn-green")} style={{ ...bigBtn, marginTop: c(1.1) }}>
                ¡A LEVANTARSE!
              </button>
              {room.members.length < 2 && <CardText size={0.95}>Hacen falta al menos 2 jugadores.</CardText>}
            </>
          ) : (
            <>
              <CardText size={1.1}>Esperando a que el anfitrión empiece la partida…</CardText>
              {error && <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white" style={{ marginTop: c(0.9), fontSize: c(1.1) }}>{error}</p>}
              <button disabled={busy} onClick={() => leave()} className={btn("w-full bg-btn-grey")} style={{ ...bigBtn, marginTop: c(0.9) }}>
                SALIR DE LA SALA
              </button>
            </>
          )}
        </CardPanel>
      )}

      <BackButton href="/" />
    </main>
  );
}
