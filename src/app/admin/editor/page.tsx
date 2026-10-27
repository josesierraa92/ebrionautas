"use client";

import dynamic from "next/dynamic";
import { EDITOR_FONT_CLASSES } from "@/editor/fonts";

// El editor usa WebGL: solo se carga en el navegador.
const BoardEditor = dynamic(() => import("@/editor/BoardEditor"), {
  ssr: false,
  loading: () => <p className="grid h-dvh place-items-center text-lg opacity-70">Cargando el editor…</p>,
});

export default function EditorPage() {
  return (
    <>
      <div className="grid h-dvh place-items-center p-6 text-center lg:hidden">
        <p className="max-w-sm text-lg">El editor del tablero se usa en un computador (pantalla grande, ratón y teclado).</p>
      </div>
      <div className={`hidden lg:block ${EDITOR_FONT_CLASSES}`}>
        <BoardEditor />
      </div>
    </>
  );
}
