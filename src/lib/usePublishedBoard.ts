"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { parseLayout, type BoardLayout } from "@/editor/layout";
import type { PublishedBoard } from "@/game/publishedBoard";
import { PLAYER_COLORS, alienArt } from "@/game/tileStyle";

// Se pide una vez por carga de página: tras publicar desde el editor, basta con recargar la TV.
let request: Promise<PublishedBoard | null> | null = null;

// Fichas propias del tablero publicado: imagen de cada color de jugador (null = el zombi de serie).
let tokenArt: (string | null)[] = [];
const listeners = new Set<() => void>();

function fetchPublished(): Promise<PublishedBoard | null> {
  request ??= fetch("/api/board", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      const board = (body?.board as PublishedBoard | null) ?? null;
      tokenArt = board?.tokens ?? [];
      listeners.forEach((l) => l());
      return board;
    })
    .catch(() => null);
  return request;
}

/** Tablero publicado desde el editor: undefined mientras carga, null si no hay (se usa el de serie). */
export function usePublishedBoard(): PublishedBoard | null | undefined {
  const [board, setBoard] = useState<PublishedBoard | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetchPublished().then((b) => alive && setBoard(b));
    return () => {
      alive = false;
    };
  }, []);
  return board;
}

let layoutRequest: Promise<BoardLayout | null> | null = null;

/** Diseño publicado (para dibujar el tablero en 3D en vivo): undefined mientras carga, null si no hay. */
export function usePublishedLayout(enabled: boolean): BoardLayout | null | undefined {
  const [layout, setLayout] = useState<BoardLayout | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    layoutRequest ??= fetch("/api/board/layout", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => parseLayout(b?.layout) ?? null)
      .catch(() => null);
    layoutRequest.then((l) => alive && setLayout(l));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return enabled ? layout : null;
}

/** Dibujo de la ficha de un color de jugador: la publicada desde el editor o, si no hay, el zombi de serie. */
export function useTokenArt(skin: string): string | null {
  const arts = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => tokenArt,
    () => tokenArt,
  );
  useEffect(() => void fetchPublished(), []);
  const i = PLAYER_COLORS.indexOf(skin.toLowerCase());
  return (i >= 0 && arts[i]) || alienArt(skin);
}
