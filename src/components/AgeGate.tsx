"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const exempt = pathname.startsWith("/admin") || pathname.startsWith("/privacidad"); // el editor y la página de privacidad se ven sin responder
  const [step, setStep] = useState<Step>("checking");

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

  return (
    <div role="dialog" aria-modal="true" aria-label="Aviso para mayores de 18 años" className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-[#0a0620] p-5 text-center">
      {step !== "checking" && (
        <div className="flex w-full max-w-md flex-col items-center gap-5">
          <div className="grid size-24 place-items-center rounded-full border-[5px] border-[#1a0b38] bg-btn-red font-display text-4xl text-white shadow-[0_6px_0_#1a0b38]">+18</div>
          {step === "ask" ? (
            <>
              <h1 className="font-display text-3xl text-btn-yellow drop-shadow-[0_2px_0_rgba(0,0,0,.6)]">Solo para mayores de 18</h1>
              <p className="text-lg text-white/85">
                <strong>Muertos de Sed</strong> es un juego para beber alcohol entre amigos. Bebe con moderación, no conduzcas si bebiste y nadie está obligado a beber: si no quieres, pasa.
              </p>
              <div className="flex w-full flex-col gap-3">
                <button autoFocus onClick={accept} className="btn-game bg-btn-green py-4 text-2xl text-white">
                  TENGO 18 AÑOS O MÁS
                </button>
                <button onClick={refuse} className="btn-game bg-btn-grey py-3 text-lg text-white">
                  SOY MENOR DE 18
                </button>
              </div>
              <p className="text-xs text-white/55">
                Tu respuesta se guarda en este aparato. Contamos visitas de forma anónima, sin nombres.{" "}
                <Link href="/privacidad" className="underline">
                  Privacidad
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl text-btn-yellow">Todavía no es tu noche</h1>
              <p className="text-lg text-white/85">Este juego es solo para mayores de 18 años. Vuelve cuando cumplas la mayoría de edad.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
