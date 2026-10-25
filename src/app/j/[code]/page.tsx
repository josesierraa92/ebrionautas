"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import Board from "@/components/Board";
import DecisionPanel from "@/components/DecisionPanel";
import GameLog from "@/components/GameLog";
import Marciano from "@/components/Marciano";
import MemberChips from "@/components/MemberChips";
import PlayersList from "@/components/PlayersList";
import RuleBanner from "@/components/RuleBanner";
import TurnHeader from "@/components/TurnHeader";
import VotePanel from "@/components/VotePanel";
import Winner from "@/components/Winner";
import { currentPlayer, type Action } from "@/game/engine";
import { emptyProfile, recordGame, traitAnswer, useProfile } from "@/lib/profile";
import { api, playerKey, saved, sendAction, useRoom } from "@/lib/room-client";

type Creds = { playerId: string; secret: string };

/** El celular de cada jugador: unirse, tirar el dado y decidir en su turno. */
export default function JugadorPage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const { room, error, refresh } = useRoom(code);
  const [creds, setCreds] = useState<Creds | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { profile, loaded: profileLoaded, update: updateProfile } = useProfile();

  useEffect(() => {
    setCreds(saved.get<Creds>(playerKey(code)));
    setLoaded(true);
  }, [code]);

  // Cada celular tiene su Ebrionauta: se crea uno al azar la primera vez.
  useEffect(() => {
    if (profileLoaded && !profile) updateProfile(emptyProfile());
  }, [profileLoaded, profile, updateProfile]);
  const profileName = profile?.name;
  useEffect(() => {
    if (profileName) setName((n) => n || profileName);
  }, [profileName]);

  // Voto automático en casillas de rasgos que el perfil ya contestó (ej. "Cegatos").
  const g = room?.game;
  const d = g?.decision;
  let autoVote: boolean | undefined;
  if (g && creds && profile && d?.kind === "SELECT_DRINKERS" && d.mode === "vote" && d.traits && !(creds.playerId in d.votes)) {
    const answers = d.traits.map((t) => traitAnswer(profile.traits, t));
    if (answers.every((a) => a !== undefined)) autoVote = answers.some(Boolean);
  }
  const autoVoteSeq = autoVote === undefined ? -1 : g!.decisionSeq;
  const votedSeq = useRef(-1);
  useEffect(() => {
    if (autoVote === undefined || !creds || votedSeq.current === autoVoteSeq) return;
    votedSeq.current = autoVoteSeq;
    sendAction(code, creds.secret, { type: "VOTE", id: creds.playerId, yes: autoVote })
      .then(refresh)
      .catch(() => {});
  }, [autoVote, autoVoteSeq, code, creds, refresh]);

  // Al terminar la partida, se suma a las estadísticas del perfil.
  useEffect(() => {
    if (!g?.winner || !profile || !creds) return;
    const next = recordGame(profile, code, g, creds.playerId);
    if (next) updateProfile(next);
  }, [g, profile, creds, code, updateProfile]);

  // Vibra cuando empieza tu turno (si el celular lo permite).
  const myTurnNow = !!(room?.game && creds && !room.game.winner && currentPlayer(room.game).id === creds.playerId);
  useEffect(() => {
    if (!myTurnNow) return;
    try {
      navigator.vibrate?.([150, 80, 150]);
    } catch {}
  }, [myTurnNow]);

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

  if (!loaded || !room) {
    return <Shell>{error ? <ErrorBox text={error} /> : <p>Conectando con la mesa {code}…</p>}</Shell>;
  }

  const member = creds && room.members.find((m) => m.id === creds.playerId);

  // 1. Unirse
  if (!member) {
    if (room.status !== "LOBBY") return <Shell><ErrorBox text="Esta partida ya empezó. Pide que creen otra mesa." /></Shell>;
    const join = () =>
      run(async () => {
        const c = await api<Creds>(`/api/rooms/${code}/join`, { name, avatar: profile?.avatar });
        if (profile) updateProfile({ ...profile, name: name.trim() });
        saved.set(playerKey(code), c);
        setCreds(c);
      });
    return (
      <Shell>
        <p className="text-white/70">Mesa <b className="font-display text-btn-yellow">{code}</b></p>
        {profile && <Marciano avatar={profile.avatar} expression="feliz" size={110} />}
        <h2 className="font-display text-3xl">¿Cómo te llamas, Ebrionauta?</h2>
        <input
          value={name}
          maxLength={16}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && !busy && join()}
          placeholder="Tu nombre"
          className="w-full rounded-xl border-[3px] border-ink bg-white px-3 py-3 text-xl text-ink outline-none"
        />
        <button disabled={!name.trim() || busy} onClick={join} className="btn-game w-full bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey">
          ¡SUBIR A BORDO!
        </button>
        <Link href={`/perfil?volver=/j/${code}`} className="btn-game w-full bg-btn-special py-2 text-lg text-white">
          🎨 PERSONALIZAR MI EBRIONAUTA
        </Link>
        <p className="text-xs text-white/50">Juego para mayores de 18 años. Bebe con moderación.</p>
        {actionError && <ErrorBox text={actionError} />}
      </Shell>
    );
  }

  // 2. Sala de espera
  if (room.status === "LOBBY" || !room.game) {
    const isFirst = room.members[0]?.id === member.id;
    return (
      <Shell>
        <Marciano avatar={member.avatar} expression="euforico" size={130} />
        <h2 className="font-display text-3xl">¡Hola, {member.name}!</h2>
        <p className="text-white/70">Esperando a que despegue la nave…</p>
        <MemberChips members={room.members} size={48} />
        {isFirst && (
          <button
            disabled={room.members.length < 2 || busy}
            onClick={() => run(() => api(`/api/rooms/${code}/start`, { secret: creds!.secret }))}
            className="btn-game w-full bg-btn-green py-4 text-2xl text-white disabled:bg-btn-grey"
          >
            {room.members.length < 2 ? "ESPERANDO JUGADORES…" : "¡DESPEGAR!"}
          </button>
        )}
        {actionError && <ErrorBox text={actionError} />}
      </Shell>
    );
  }

  // 3. Partida
  const game = room.game;
  const turnOf = currentPlayer(game);
  const myTurn = turnOf.id === member.id && !game.winner;
  const winner = game.players.find((p) => p.id === game.winner);
  const act = (a: Action) => run(() => sendAction(code, creds!.secret, a));
  const mine = game.players.find((p) => p.id === member.id)!;
  const vote = game.decision?.kind === "SELECT_DRINKERS" && game.decision.mode === "vote" ? game.decision : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="title-game text-2xl">EBRIONAUTAS</span>
        <span className="font-display text-white/70">Mesa {code}</span>
      </div>
      {game.rule && <RuleBanner text={game.rule.text} />}

      {mine.pending > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-btn-red p-3">
          <span className="text-4xl">🍷</span>
          <p className="flex-1 font-display text-xl">
            Debes {mine.pending} {mine.pending === 1 ? "vaso" : "vasos"}
          </p>
          <button disabled={busy} onClick={() => act({ type: "DRANK", id: member.id })} className="btn-game bg-btn-green px-4 py-3 text-lg text-white">
            ¡BEBIDO!
          </button>
        </div>
      )}

      <div className={`rounded-2xl border-[3px] border-ink p-4 ${myTurn ? "bg-btn-green/25" : "bg-ink/80"}`}>
        {winner ? (
          <Winner winner={winner}>
            <Link href="/" className="btn-game bg-btn-green py-3 text-xl text-white">
              VOLVER AL INICIO
            </Link>
          </Winner>
        ) : (
          <div className="flex flex-col gap-3">
            <TurnHeader game={game} you={member.id} />
            {vote && <VotePanel decision={vote} players={game.players} myId={member.id} isMyTurn={myTurn} busy={busy} onAction={act} />}
            {myTurn && game.phase === "ROLL" && (
              <button disabled={busy} onClick={() => act({ type: "ROLL" })} className="btn-game bg-btn-green py-6 text-3xl text-white disabled:bg-btn-grey">
                {turnOf.status.laberinto ? "TIRAR (5 o 6 para salir)" : "🎲 TIRAR"}
              </button>
            )}
            {myTurn && !vote && game.phase === "DECISION" && game.decision && (
              // fieldset deshabilitado: evita enviar la misma jugada dos veces mientras llega la respuesta
              <fieldset disabled={busy} className="contents">
                <DecisionPanel key={game.decisionSeq} decision={game.decision} me={turnOf} players={game.players} onAction={act} />
              </fieldset>
            )}
            {!myTurn && !vote && <p className="text-white/70">{game.log[0]?.text}</p>}
          </div>
        )}
        {actionError && <ErrorBox text={actionError} />}
      </div>

      <PlayersList game={game} highlight={member.id} onPenalty={(id) => act({ type: "PENALTY", id })} />
      <Board players={game.players} current={turnOf.id} />
      <GameLog log={game.log} max={15} />
      {error && <p className="text-sm text-btn-red">⚠️ {error}</p>}
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 py-10 text-center">{children}</main>;
}

function ErrorBox({ text }: { text: string }) {
  return <p className="rounded-xl border-[3px] border-ink bg-btn-red px-3 py-2 text-white">{text}</p>;
}
