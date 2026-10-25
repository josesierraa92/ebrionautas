"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action } from "@/game/engine";
import type { PublicRoom } from "@/server/rooms";

const POLL_MS = 1000;

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "No se pudo conectar con la mesa.");
  return data as T;
}

/** Credenciales guardadas en este dispositivo (try/catch: el almacenamiento puede estar bloqueado). */
export const saved = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

export const hostKey = (code: string) => `ebrionautas:host:${code}`;
export const playerKey = (code: string) => `ebrionautas:jugador:${code}`;

/** Sigue el estado de una sala consultando al servidor cada segundo. */
export function useRoom(code: string) {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(-1);

  const refresh = useCallback(async () => {
    try {
      const r = await api<PublicRoom>(`/api/rooms/${code}`);
      setError(null);
      if (r.version !== version.current) {
        version.current = r.version;
        setRoom(r);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [code]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { room, error, refresh };
}

export function sendAction(code: string, secret: string, action: Action) {
  return api(`/api/rooms/${code}/action`, { secret, action });
}
