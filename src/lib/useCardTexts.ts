"use client";

import { useEffect, useState } from "react";
import { parseCardOverrides, setCardOverrides, type CardOverrides } from "@/game/cards";
import { DEFAULT_CATEGORIES, getCategories, parseCategories, setCategories } from "@/game/content";

// Textos de las tarjetas que cambió el admin desde el editor: se piden una vez por carga de página y se dejan
// puestos en `game/cards.ts`, que es lo que lee `tileRule`. Mientras llegan se ven los de serie.
let request: Promise<CardOverrides> | null = null;

export function fetchCardTexts(force = false): Promise<CardOverrides> {
  if (force || !request)
    request = fetch("/api/cards", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        const o = parseCardOverrides(b?.cards);
        setCardOverrides(o);
        if (b?.categories) setCategories(parseCategories(b.categories));
        return o;
      })
      .catch(() => ({}));
  return request;
}

/** Carga los textos propios de las tarjetas y vuelve a pintar el componente cuando llegan. */
export function useCardTexts() {
  const [, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    void fetchCardTexts().then(() => alive && setN((n) => n + 1));
    return () => {
      alive = false;
    };
  }, []);
}
