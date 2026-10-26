"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Detecta cuando se agita el celular (DeviceMotion). En iPhone hay que pedir permiso
// desde un toque del usuario: `request()` lo hace; en Android funciona directamente.

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> };
export type ShakeState = "unsupported" | "needs-permission" | "on" | "denied";

const THRESHOLD = 28; // cambio brusco de aceleración (m/s²) que cuenta como sacudida
const HITS = 2; // sacudidas seguidas necesarias
const WINDOW_MS = 700;
const COOLDOWN_MS = 1500;

export function useShake(onShake: () => void, enabled: boolean) {
  const [state, setState] = useState<ShakeState>("unsupported");
  const cb = useRef(onShake);
  cb.current = onShake;
  const on = useRef(enabled);
  on.current = enabled;

  useEffect(() => {
    if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") return;
    const needs = typeof (DeviceMotionEvent as unknown as MotionPermission).requestPermission === "function";
    setState(needs ? "needs-permission" : "on");
  }, []);

  useEffect(() => {
    if (state !== "on") return;
    let last: { x: number; y: number; z: number } | null = null;
    let hits: number[] = [];
    let quietUntil = 0;
    const handle = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const now = Date.now();
      if (last) {
        const delta = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
        if (delta > THRESHOLD && now > quietUntil) {
          hits = [...hits.filter((t) => now - t < WINDOW_MS), now];
          if (hits.length >= HITS) {
            hits = [];
            quietUntil = now + COOLDOWN_MS;
            if (on.current) cb.current();
          }
        }
      }
      last = { x: a.x, y: a.y, z: a.z };
    };
    window.addEventListener("devicemotion", handle);
    return () => window.removeEventListener("devicemotion", handle);
  }, [state]);

  /** Pide permiso en iPhone. Llamar desde un toque del usuario. */
  const request = useCallback(async () => {
    const req = (DeviceMotionEvent as unknown as MotionPermission).requestPermission;
    if (!req) return;
    try {
      setState((await req()) === "granted" ? "on" : "denied");
    } catch {
      setState("denied");
    }
  }, []);

  return { state, request };
}
