"use client";

import BackButton from "@/components/BackButton";
import CardPanel, { CardText, GREEN } from "@/components/CardPanel";
import Controller from "@/components/Controller";
import Logo from "@/components/Logo";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { use, useEffect, useRef, useState } from "react";
import BoardStage from "@/components/BoardStage";
import { Confetti } from "@/components/Fx";
import GameLog from "@/components/GameLog";
import PlayersList from "@/components/PlayersList";
import SoundToggle from "@/components/SoundToggle";
import Clasificatoria from "@/components/Clasificatoria";
import { PanelCard, RuleCard, TurnChip } from "@/components/TvCards";
import Winner from "@/components/Winner";
import { currentPlayer, type Decision } from "@/game/engine";
import OnlineLobby from "@/components/OnlineLobby";
import { api, controlKey, epochKey, hostKey, memberKey, saved, useRoom, type SavedMember } from "@/lib/room-client";
import { useAutoUpdate } from "@/lib/useAutoUpdate";
import { usePublishedLayout } from "@/lib/usePublishedBoard";
import { useGameFx } from "@/lib/useGameFx";
import { music, unlock } from "@/lib/sfx";

/**
 * Pantalla grande (TV / portátil): QR para el control, tablero y marcador. Solo muestra.
 * Con `?solo=1` es el modo «un solo aparato» (PC o celular): la misma pantalla es la TV y el control (jugadores, dado, decisiones, ajustes).
 */
export default function MesaPage({ params }: { params: Promise<{ code: string }> }) {
  const code = use(params).code.toUpperCase();
  const { room, error, refresh } = useRoom(code);
  const [hostSecret, setHostSecret] = useState<string | null>(null);
  const heldCard = useRef<{ n: number; playerId: string; key: number; result?: Parameters<typeof PanelCard>[0]["result"]; waiting?: boolean } | null>(null); // la última tarjeta del panel: no se cambia mientras la TV anima la tirada
  const [dismissedRequest, setDismissedRequest] = useState<number | null>(null); // «AHORA NO» del aviso de otro celular
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [controlUrl, setControlUrl] = useState("");
  // modo «un solo aparato»: este mismo aparato lleva el control de la mesa
  const [solo, setSolo] = useState(false);
  const [controlSecret, setControlSecret] = useState<string | null>(null);
  const [controlEpoch, setControlEpoch] = useState<number | null>(null);
  const triedClaim = useRef(false);
  const [member, setMember] = useState<SavedMember | null>(null); // mesa online: con qué clave se sentó este aparato
  const [narrow, setNarrow] = useState(false); // pantalla estrecha (celular): lo que se dibuja sobre el tablero va más chico
  const [portrait, setPortrait] = useState(false); // celular vertical: la tarjeta va casi a todo el ancho y el dado abajo en el centro
  const fx = useGameFx(room?.game ?? null);
  // música de fondo mientras hay partida (la TV o el aparato único; el celular de control no la pone); el navegador solo deja sonar tras un toque
  const [overview, setOverview] = useState(false); // el ojito del celular: vista de arriba con todos los jugadores
  const playing = !!room?.game;
  useEffect(() => {
    if (!playing) return;
    music.start();
    // en el iPhone el audio solo se despierta con un toque «de verdad» (touchend/click): se intenta en cada toque hasta que suena
    const wake = () => void unlock();
    const events = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, wake));
    document.addEventListener("visibilitychange", wake);
    return () => {
      events.forEach((e) => window.removeEventListener(e, wake));
      document.removeEventListener("visibilitychange", wake);
      music.stop();
    };
  }, [playing]);
  // Se recarga sola cuando hay una versión nueva del juego (sin dado ni jugada en marcha).
  useAutoUpdate(fx.settled && !fx.dice && !fx.banner);
  // tamaño de la tarjeta de la casilla y del cuadro del turno elegido en el editor (el diseño publicado; 100 % de serie)
  const published = usePublishedLayout(true);
  const ui = published?.ui ?? { card: 100, chip: 100 };
  // Panel del marcador a la derecha: se puede ocultar para ver solo el tablero (se recuerda en esta TV).
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    setHostSecret(saved.get<string>(hostKey(code)));
    setControlUrl(`${window.location.origin}/c/${code}`);
    setPanelOpen(saved.get<boolean>(PANEL_KEY) ?? true);
    setSolo(new URLSearchParams(window.location.search).has("solo"));
    const mq = window.matchMedia("(max-width: 1023px)");
    const onMq = () => setNarrow(mq.matches);
    const mp = window.matchMedia("(orientation: portrait)");
    const onMp = () => setPortrait(mp.matches);
    onMq();
    onMp();
    mq.addEventListener("change", onMq);
    mp.addEventListener("change", onMp);
    setMember(saved.get<SavedMember>(memberKey(code)));
    setControlSecret(saved.get<string>(controlKey(code)));
    setControlEpoch(saved.get<number>(epochKey(code)));
    return () => {
      mq.removeEventListener("change", onMq);
      mp.removeEventListener("change", onMp);
    };
  }, [code]);

  // Un solo aparato: si la mesa aún no tiene quien la controle, este aparato toma el control (una sola vez)
  useEffect(() => {
    if (!solo || !room || controlSecret || room.hasController || triedClaim.current) return;
    triedClaim.current = true;
    api<{ secret: string; epoch: number }>(`/api/rooms/${code}/control`, {})
      .then(async (r) => {
        saved.set(controlKey(code), r.secret);
        saved.set(epochKey(code), r.epoch);
        await refresh(); // primero la mesa ya con control y después la clave: si no, parecería que «te quitaron el control»
        setControlSecret(r.secret);
        setControlEpoch(r.epoch);
      })
      .catch(() => {});
  }, [solo, room, controlSecret, code, refresh]);
  // …y si otro aparato se lleva el control (la TV lo liberó), este suelta su clave y no lo vuelve a pedir solo
  const lostControl = solo && !!room && !!controlSecret && (!room.hasController || (controlEpoch !== null && room.controlEpoch !== controlEpoch));
  useEffect(() => {
    if (!lostControl) return;
    triedClaim.current = true;
    saved.set(controlKey(code), null);
    setControlSecret(null);
  }, [lostControl, code]);
  const soloActive = solo && !!room && !!controlSecret && !lostControl && room.mode !== "online";
  // mesa online con la partida en marcha: si este aparato está sentado, juega con el mismo tablero a pantalla completa y su dado (solo en su turno)
  const mySeat = room?.mode === "online" && member ? room.members.find((m) => m.id === member.id) : undefined;
  const onlineActive = !!room?.game && !!mySeat?.playerId;
  const playActive = soloActive || onlineActive;
  const playSecret = onlineActive ? member!.secret : controlSecret!;

  const togglePanel = () => {
    saved.set(PANEL_KEY, !panelOpen);
    setPanelOpen(!panelOpen);
  };

  if (!room) return <Centered>{error ?? "Conectando con la mesa…"}</Centered>;

  // Otro celular pidió el control mientras alguien lo tiene: sale este aviso con «LIBERAR» (y nada más: sin botones fijos en la pantalla)
  const releaseNow = async () => {
    setReleasing(true);
    setReleaseError(null);
    try {
      await api(`/api/rooms/${code}/control`, { hostSecret }, "DELETE");
    } catch (e) {
      setReleaseError(`${(e as Error).message} Abre esta pantalla en el mismo navegador donde creaste la mesa, o crea una mesa nueva.`);
    } finally {
      setReleasing(false);
    }
    await refresh();
  };
  const askingControl = !!room.claimRequest && room.hasController && room.claimRequest !== dismissedRequest;
  const claimPopup = askingControl ? (
    <CardPanel
      unit="min(1.5vw, 2.4vh)"
      width={26}
      kicker="Otro celular"
      title="¿Liberar el control?"
      centerTitle
      onClose={() => setDismissedRequest(room.claimRequest ?? null)}
      actions={
        <>
          <button disabled={releasing} onClick={releaseNow} className="btn-game w-full bg-btn-green text-white disabled:bg-btn-grey" style={{ fontSize: "calc(var(--u) * 2)", padding: "calc(var(--u) * .8) calc(var(--u) * 1.2)" }}>
            {releasing ? "LIBERANDO…" : "LIBERAR"}
          </button>
          <button onClick={() => setDismissedRequest(room.claimRequest ?? null)} className="font-display uppercase underline" style={{ color: "#bffa58", fontSize: "calc(var(--u) * 1.1)" }}>
            Ahora no
          </button>
        </>
      }
    >
      <CardText size={1.25}>Otro celular quiere controlar la mesa. Si lo liberas, el celular de ahora deja de controlar.</CardText>
      {releaseError && <CardText size={1.05}>{releaseError}</CardText>}
    </CardPanel>
  ) : null;

  // un solo aparato: mientras toma el control se espera un instante
  if (solo && room.mode !== "online" && !soloActive && !room.hasController) return <Centered>Preparando la mesa…</Centered>;

  if (soloActive && (room.status === "LOBBY" || !room.game)) {
    return (
      <>
        <Controller code={code} room={room} secret={controlSecret!} error={error} refresh={refresh} backHref="/" />
        {claimPopup}
      </>
    );
  }

  // mesa online: sala de espera (cada quien entra con su aparato; el anfitrión empieza)
  if (room.mode === "online" && (room.status === "LOBBY" || !room.game)) {
    return <OnlineLobby code={code} room={room} hostSecret={hostSecret} member={member} onMember={setMember} refresh={refresh} />;
  }

  if (room.status === "LOBBY" || !room.game) {
    // sala de espera: el logo y una tarjeta con el mismo diseño que las de las casillas (`CardPanel`, regla de diseño del CLAUDE.md)
    const lobbyUnit = "max(min(1.4vw, 1.8vh), min(2.5vw, 1.2vh))"; // en horizontal (TV) manda la primera; en vertical (celular) la segunda, para que la tarjeta no quede diminuta
    const c = (k: number) => `calc(var(--u) * ${k})`;
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center gap-[min(1.5rem,2.2vh)] px-4 py-[min(2rem,2vh)] text-center">
        <Link href="/" aria-label="Muertos de Sed" className="block w-[min(34rem,70vw,50vh)]">
          <Logo className="w-full" />
        </Link>
        {room.hasController ? (
          <CardPanel
            inline
            unit={lobbyUnit}
            width={30}
            kicker="¡Listo!"
            title="Celular conectado"
            badge="OK"
          >
            <CardText size={1.3}>Agregad a los jugadores desde el celular y pulsad ¡A LEVANTARSE!</CardText>
          </CardPanel>
        ) : (
          <CardPanel inline unit={lobbyUnit} width={36} kicker="Sala de espera" title="Escanea el QR" badge="QR">
            <CardText size={1.3}>Escanéalo con el celular que va a controlar el juego, o entra a la web y pon el código:</CardText>
            <div className="flex items-center justify-center" style={{ marginTop: c(1.3), gap: c(1.6) }}>
              {controlUrl && (
                <div className="shrink-0 bg-white" style={{ width: c(11), padding: c(0.8), borderRadius: c(1) }}>
                  <QRCodeSVG value={controlUrl} size={256} style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              )}
              <div className="grid place-items-center font-display" style={{ minWidth: c(11), padding: `${c(1)} ${c(1.2)}`, borderRadius: c(1), background: GREEN, color: "#14260a", fontSize: c(4.6), letterSpacing: "0.12em", lineHeight: 1, paddingLeft: c(1.6) }}>
                {code}
              </div>
            </div>
          </CardPanel>
        )}
        {/* local sin celular: la misma pantalla es el control (jugadores, dado, decisiones) */}
        {!room.hasController && (
          <a href={`/mesa/${code}?solo=1`} className="btn-game bg-btn-pink text-white" style={{ fontSize: "max(1rem, min(1.5vw, 2.3vh))", padding: "0.5em 1.3em" }}>
            JUGAR SIN CELULAR, EN ESTA PANTALLA
          </a>
        )}
        {/* volver al inicio (en el celular no había cómo salir de esta pantalla) */}
        <BackButton href="/" />
        {claimPopup}
      </main>
    );
  }

  const game = room.game;
  const me = currentPlayer(game);
  const winner = game.players.find((p) => p.id === game.winner);

  // Tarjeta grande: explica la casilla donde cayó alguien (o lo que pasó al tirar) y se queda
  // hasta la siguiente tirada; si hay que decidir, enseña además qué marcar en el celular.
  const sameTile = fx.landed?.playerId === me.id && fx.landed.n === me.pos;
  const card = winner || !fx.settled || fx.banner
    ? null
    : game.decision
      ? { n: me.pos, playerId: me.id, key: sameTile ? fx.landed!.key : 100000 + game.decisionSeq }
      : fx.landed
        ? { n: fx.landed.n, playerId: fx.landed.playerId, key: fx.landed.key, result: fx.landed.result }
        : null;

  // el celular abrió la clasificatoria: sustituye al mensaje de ganador y tapa el tablero (fuera de BoardStage: ocupa toda la pantalla)
  const ranking = winner && game.ranking ? <Clasificatoria game={game} unit="min(1.7vw, 2.6vh)" /> : null;

  // Tarjeta del panel de la derecha (modo con marcador): la de lo que acaba de pasar; si no hay nada que explicar, la de la casilla donde está quien juega,
  // con «tira el dado desde el celular». Mientras la TV anima la tirada se queda la anterior (no se adelanta la casilla nueva).
  const settledNow = fx.settled && !fx.banner;
  const fresh = card ? { n: card.n, playerId: card.playerId, key: card.key, result: "result" in card ? card.result : undefined } : settledNow ? { n: me.pos, playerId: me.id, key: 500000 + (game.rollSeq ?? 0), waiting: true } : null;
  if (fresh) heldCard.current = fresh;
  const panelCard = fresh ?? heldCard.current ?? { n: me.pos, playerId: me.id, key: 500000, waiting: true };

  const overlays = (withCard: boolean) => (
    <>
      {/* hasta que llega el diseño publicado no se dibuja: con los valores de serie salía un instante la estrella en su sitio de antes y luego saltaba al configurado */}
      {published !== undefined && <TurnChip game={game} moving={!fx.settled || !!game.waiting} rolling={!!fx.dice?.rolling} scale={(ui.chip / 100) * (playActive && narrow ? 0.7 : 1)} chip={published?.chip} topAlign={playActive && narrow} />}
      {withCard && card && <RuleCard game={game} n={card.n} playerId={card.playerId} cardKey={card.key} result={"result" in card ? card.result : undefined} scale={ui.card / 100} wide={playActive && portrait} />}
    </>
  );

  // Un solo aparato: el tablero a pantalla completa, como en la TV, con el control flotando encima (dado, decisiones, botones)
  if (playActive) {
    return (
      <main className="fixed inset-0">
        <BoardStage players={game.players} current={me.id} winner={game.winner} fx={fx} bare overview={overview} className="h-full">
          {overlays(!game.decision)}
          <Controller
            overlay
            narrow={portrait}
            overview={overview}
            onOverview={() => setOverview((v) => !v)}
            locked={!fx.settled || !!fx.banner || !!fx.dice}
            card={card}
            code={code}
            room={room}
            secret={playSecret}
            seat={onlineActive ? { playerId: mySeat!.playerId!, host: !!mySeat!.host } : undefined}
            error={error}
            refresh={refresh}
          />
        </BoardStage>
        {winner && !game.ranking && <Confetti />}
        {claimPopup}
      </main>
    );
  }

  // Modo tablero a pantalla completa: sin barra ni marcador, solo unos botones pequeños flotando.
  if (!panelOpen) {
    return (
      <main className="fixed inset-0">
        <BoardStage players={game.players} current={me.id} winner={game.winner} fx={fx} bare className="h-full">
          {overlays(true)}
          <div className="absolute top-[2%] right-[1.5%] z-50 flex items-center gap-2">
            <SoundToggle />
            <button onClick={toggleFullscreen} aria-label="Pantalla completa" title="Pantalla completa" className="icon-btn">
              ⛶
            </button>
            <button onClick={togglePanel} aria-label="Marcador" title="Marcador" className="icon-btn">
              ☰
            </button>
          </div>
        </BoardStage>
        {winner && !game.ranking && <Confetti />}
        {ranking}
        {claimPopup}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start">
      <section className="flex flex-col gap-3 lg:flex-1">
        <div className="flex items-center justify-between gap-2">
          <Logo className="w-48 sm:w-60" />
          <span className="flex items-center gap-2 font-display text-white/70">
            <SoundToggle />
            <button onClick={toggleFullscreen} aria-label="Pantalla completa" title="Pantalla completa" className="icon-btn">
              ⛶
            </button>
            <button onClick={togglePanel} aria-label="Solo tablero" title="Solo tablero (oculta el marcador)" className="icon-btn">
              ⤢
            </button>
            <span className="ml-2">Mesa {code}</span>
          </span>
        </div>
        <BoardStage
          players={game.players}
          current={me.id}
          winner={game.winner}
          fx={fx}
          className={`aspect-[16/10] lg:aspect-auto lg:h-[calc(100dvh-5.5rem)]`}
        >
          {overlays(false)}
        </BoardStage>
        {winner && !game.ranking && <Confetti />}
        {ranking}
      </section>
      <aside className="flex flex-col gap-4 lg:w-[28rem]">
        {winner ? (
          <div className="rounded-2xl border-[3px] border-ink bg-ink/80 p-4">
            <Winner winner={winner} players={game.players} />
          </div>
        ) : (
          <PanelCard game={game} n={panelCard.n} playerId={panelCard.playerId} cardKey={panelCard.key} result={panelCard.result} prompt={panelCard.waiting ? `${me.name}, tira el dado desde el celular` : null} />
        )}
        <PlayersList game={game} big />
        <GameLog log={game.log} max={12} big />
        {error && <p className="text-sm text-btn-red">⚠️ {error}</p>}
      </aside>
      {claimPopup}
    </main>
  );
}

const PANEL_KEY = "ebrionautas:panel";


function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg">{children}</p>
      <Link href="/" className="btn-game bg-btn-yellow px-6 py-2 text-white">
        VOLVER
      </Link>
    </main>
  );
}
