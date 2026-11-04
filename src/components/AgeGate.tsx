"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CardPanel, { CardText, GREEN_LIGHT } from "@/components/CardPanel";
import LegalDialog, { type LegalKind } from "@/components/LegalDialog";

// Aviso de +18 (el juego va de beber alcohol). Se pregunta una vez por aparato y la respuesta se guarda en el navegador.
// Es una declaración, no una verificación de edad. El editor (/admin) no lo enseña.
// De paso avisa al servidor, sin datos personales, de cada aparato nuevo y de cada visita (ver src/server/stats.ts).

export const AGE_KEY = "ebrio:edad";
const SEEN_KEY = "ebrio:visto"; // último día en que este aparato abrió el juego
const SESSION_KEY = "ebrio:sesion"; // ya contamos esta visita (se borra al cerrar la pestaña)

const get = (area: "local" | "session", key: string) => {
  try {
    return (area === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null; // navegador sin almacenamiento (algunas TV, modo privado): se pregunta cada vez
  }
};
const put = (area: "local" | "session", key: string, value: string) => {
  try {
    (area === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    /* sin almacenamiento */
  }
};

function send(event: "edad_si" | "edad_no" | "visita" | "vuelve") {
  try {
    fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event }), keepalive: true }).catch(() => {});
  } catch {
    /* las estadísticas nunca deben romper el juego */
  }
}

/** Cuenta la visita una vez por pestaña y, si este aparato ya había venido otro día, que volvió. */
function countVisit() {
  if (get("session", SESSION_KEY)) return;
  put("session", SESSION_KEY, "1");
  const today = new Date().toISOString().slice(0, 10);
  const last = get("local", SEEN_KEY);
  send("visita");
  if (last && last < today) send("vuelve");
  put("local", SEEN_KEY, today);
}

type Step = "checking" | "ask" | "denied" | "ok";

export default function AgeGate() {
  const pathname = usePathname();
  const exempt = pathname.startsWith("/admin") || pathname.startsWith("/privacidad") || pathname.startsWith("/terminos"); // el editor y las páginas legales se ven sin responder
  const [step, setStep] = useState<Step>("checking");
  const [legal, setLegal] = useState<LegalKind | null>(null);

  useEffect(() => {
    if (exempt) return;
    if (get("local", AGE_KEY) === "ok") {
      setStep("ok");
      countVisit();
    } else {
      setStep("ask");
    }
  }, [exempt]);

  if (exempt || step === "ok") return null;

  const accept = () => {
    put("local", AGE_KEY, "ok");
    send("edad_si");
    setStep("ok");
    countVisit();
  };
  const refuse = () => {
    send("edad_no");
    setStep("denied");
  };

  // mientras se mira el aparato, una pantalla lisa para que no se vea el juego un instante
  if (step === "checking") return <div aria-hidden className="fixed inset-0 z-[9999] bg-[#0a0620]" />;

  return (
    <>
      {step === "ask" ? (
        <CardPanel
          solid
          kicker="Solo para adultos"
          title="Solo para mayores de 18"
          badge="+18"
          label="Aviso para mayores de 18 años"
          actions={
            <>
              <button autoFocus onClick={accept} className="btn-game bg-btn-green py-4 text-2xl text-white">
                TENGO 18 AÑOS O MÁS
              </button>
              <button onClick={refuse} className="btn-game bg-btn-grey py-3 text-lg text-white">
                SOY MENOR DE 18
              </button>
            </>
          }
        >
          <CardText>
            <strong className="text-white">Muertos de Sed</strong> es un juego para beber alcohol entre amigos. Bebe con moderación, no conduzcas si bebiste y nadie está obligado a beber: si no quieres, pasa.
          </CardText>
          <p className="text-xs" style={{ marginTop: 10, color: "#d8d4f6", opacity: 0.65, fontFamily: "var(--font-nunito), sans-serif", fontWeight: 700 }}>
            Tu respuesta se guarda en este dispositivo. Contamos visitas de forma anónima, sin nombres.{" "}
            <button className="underline" style={{ color: GREEN_LIGHT }} onClick={() => setLegal("privacidad")}>
              Privacidad
            </button>{" "}
            ·{" "}
            <button className="underline" style={{ color: GREEN_LIGHT }} onClick={() => setLegal("terminos")}>
              Términos
            </button>
          </p>
        </CardPanel>
      ) : (
        <CardPanel solid kicker="Solo para adultos" title="Todavía no es tu noche" badge="+18" label="Aviso para mayores de 18 años">
          <CardText>Este juego es solo para mayores de 18 años. Vuelve cuando cumplas la mayoría de edad.</CardText>
        </CardPanel>
      )}
      {legal && <LegalDialog kind={legal} onClose={() => setLegal(null)} />}
    </>
  );
}
