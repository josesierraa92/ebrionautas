"use client";

import { useEffect, useState } from "react";
import type { PublishedBoard } from "@/game/publishedBoard";

// Se pide una vez por carga de página: tras publicar desde el editor, basta con recargar la TV.
let request: Promise<PublishedBoard | null> | null = null;

/** Tablero publicado desde el editor: undefined mientras carga, null si no hay (se usa el de serie). */
export function usePublishedBoard(): PublishedBoard | null | undefined {
  const [board, setBoard] = useState<PublishedBoard | null | undefined>(undefined);
  useEffect(() => {
    request ??= fetch("/api/board", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => (body?.board as PublishedBoard | null) ?? null)
      .catch(() => null);
    let alive = true;
    request.then((b) => alive && setBoard(b));
    return () => {
      alive = false;
    };
  }, []);
  return board;
}
