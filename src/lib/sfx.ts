"use client";

// Efectos de sonido sintetizados con Web Audio: sin archivos ni licencias.
// El navegador solo deja sonar después de un toque del usuario; si el contexto
// está suspendido, `needsUnlock()` lo indica y `unlock()` lo reanuda.

const MUTE_KEY = "ebrionautas:silencio";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try {
  muted = typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
} catch {}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {}
  if (master) master.gain.value = value ? 0 : 0.6;
}

export function needsUnlock() {
  const a = audio();
  return !!a && a.state !== "running";
}

export function unlock() {
  return audio()?.resume();
}

/** Un tono con envolvente rápida; `to` hace un glissando hasta esa frecuencia. */
function tone(freq: number, dur: number, opts: { type?: OscillatorType; to?: number; at?: number; vol?: number } = {}) {
  const a = audio();
  if (!a || !master || muted || a.state !== "running") return;
  const t = a.currentTime + (opts.at ?? 0);
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(opts.vol ?? 0.3, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Ráfaga de ruido filtrado (golpes del dado, viento del agujero negro). */
function noise(dur: number, opts: { at?: number; freq?: number; vol?: number; q?: number } = {}) {
  const a = audio();
  if (!a || !master || muted || a.state !== "running") return;
  const t = a.currentTime + (opts.at ?? 0);
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = opts.freq ?? 2000;
  filter.Q.value = opts.q ?? 1;
  const gain = a.createGain();
  gain.gain.value = opts.vol ?? 0.4;
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
}

export const sfx = {
  dice() {
    for (let i = 0; i < 7; i++) noise(0.05, { at: i * 0.09 + Math.random() * 0.03, freq: 1800 + Math.random() * 1500, q: 4, vol: 0.5 });
    tone(520, 0.08, { at: 0.68, type: "square", vol: 0.12 });
  },
  step() {
    tone(660, 0.07, { type: "triangle", to: 880, vol: 0.18 });
  },
  land() {
    tone(392, 0.12, { type: "triangle", vol: 0.2 });
    tone(523, 0.16, { type: "triangle", at: 0.08, vol: 0.2 });
  },
  oca() {
    // "¡Cuac, cuac!"
    tone(700, 0.14, { type: "sawtooth", to: 420, vol: 0.18 });
    tone(720, 0.16, { type: "sawtooth", to: 400, at: 0.2, vol: 0.18 });
  },
  fly() {
    tone(300, 0.5, { type: "sine", to: 1400, vol: 0.18 });
  },
  jail() {
    for (let i = 0; i < 4; i++) tone(i % 2 ? 620 : 880, 0.22, { type: "square", at: i * 0.22, vol: 0.1 });
  },
  blackhole() {
    tone(500, 1.2, { type: "sine", to: 40, vol: 0.35 });
    noise(1.2, { freq: 300, q: 0.7, vol: 0.25 });
  },
  slip() {
    tone(1200, 0.5, { type: "sine", to: 200, vol: 0.25 });
  },
  spooky() {
    tone(330, 0.6, { type: "sine", to: 300, vol: 0.18 });
    tone(415, 0.6, { type: "sine", to: 390, vol: 0.12 });
  },
  zap() {
    tone(1500, 0.12, { type: "square", to: 300, vol: 0.12 });
    tone(1500, 0.12, { type: "square", to: 300, at: 0.15, vol: 0.12 });
  },
  drink() {
    // "glu-glu"
    for (let i = 0; i < 3; i++) tone(180 + i * 25, 0.09, { type: "sine", to: 120, at: i * 0.11, vol: 0.35 });
  },
  gavel() {
    noise(0.06, { freq: 600, q: 2, vol: 0.6 });
    noise(0.06, { freq: 600, q: 2, vol: 0.6, at: 0.18 });
  },
  win() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((f, i) => tone(f, i === notes.length - 1 ? 0.6 : 0.16, { type: "triangle", at: i * 0.14, vol: 0.25 }));
  },
};
