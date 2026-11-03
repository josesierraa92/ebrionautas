"use client";

// Enlaces «Privacidad · Términos» del pie de la portada: abren el pop-up legal en el mismo sitio.
import { useState } from "react";
import LegalDialog, { type LegalKind } from "@/components/LegalDialog";

export default function LegalLinks({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState<LegalKind | null>(null);
  return (
    <>
      <span className={className}>
        <button className="underline" onClick={() => setOpen("privacidad")}>
          Privacidad
        </button>{" "}
        ·{" "}
        <button className="underline" onClick={() => setOpen("terminos")}>
          Términos
        </button>
      </span>
      {open && <LegalDialog kind={open} onClose={() => setOpen(null)} />}
    </>
  );
}
