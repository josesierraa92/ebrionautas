"use client";

// Lo que enseñan /privacidad y /terminos: el pop-up legal sobre el fondo del juego. Al cerrarlo vuelve al inicio.
import { useRouter } from "next/navigation";
import LegalDialog, { type LegalKind } from "@/components/LegalDialog";

export default function LegalRoute({ kind }: { kind: LegalKind }) {
  const router = useRouter();
  return (
    <main className="min-h-dvh bg-[#0a0620]">
      <LegalDialog kind={kind} onClose={() => router.push("/")} />
    </main>
  );
}
