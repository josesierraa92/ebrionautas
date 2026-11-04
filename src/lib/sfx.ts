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

// ---------------------------------------------------------------- música de fondo
// Muy lenta y suave, de cripta: un piano apagado toca una melodía sencilla y pegajosa (como las de Minecraft: pocas notas, largos silencios,
// mucha reverberación), sobre un colchón de cuerdas graves y una campanada lejana. De vez en cuando, una frasecita de caja de música en
// modo mayor, medio feliz, como de circo viejo. Todo sintetizado (sin archivos ni licencias) y a muy poco volumen.

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const BPM = 54;
const STEP = 60 / BPM / 2; // una corchea (~0,56 s)
const LOOP = 128; // 16 compases de 8 corcheas, ~71 s

// acordes del colchón, uno cada 2 compases: raíz grave y notas del acorde
const PADS: { root: number; chord: number[] }[] = [
  { root: 33, chord: [45, 52, 57] }, // La menor
  { root: 29, chord: [45, 53, 57] }, // Fa
  { root: 36, chord: [48, 52, 55] }, // Do
  { root: 28, chord: [44, 52, 56] }, // Mi (con sol sostenido)
  { root: 33, chord: [45, 52, 57] }, // La menor
  { root: 38, chord: [45, 50, 53] }, // Re menor
  { root: 29, chord: [45, 53, 57] }, // Fa
  { root: 28, chord: [44, 52, 56] }, // Mi
];
// melodía: [corchea, nota, duración en corcheas, caja de música]
const TUNE: [number, number, number, boolean][] = [
  [0, 69, 4, false], [4, 72, 3, false], [8, 76, 7, false], [15, 74, 1, false],
  [16, 72, 4, false], [20, 69, 3, false], [24, 67, 8, false],
  // (silencio)
  [48, 76, 1, true], [49, 76, 1, true], [50, 76, 1, true], [51, 72, 5, true], [57, 79, 1, true], [58, 76, 1, true], [59, 72, 3, true],
  // (silencio)
  [96, 69, 4, false], [100, 72, 3, false], [104, 76, 4, false], [108, 80, 3, false], [111, 81, 9, false],
  [120, 84, 1, true], [121, 81, 1, true], [122, 76, 1, true], [123, 72, 5, true],
];
const TUNE_AT = new Map(TUNE.map((t) => [t[0], t]));

let musicGain: GainNode | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;
let musicNext = 0;

/** Reverberación de sala grande y fría: ruido que se apaga despacio. */
function reverb(a: AudioContext) {
  const len = Math.floor(a.sampleRate * 3.2);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const conv = a.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** Piano apagado: triángulo con un armónico suave, ataque rápido y caída larga. */
function piano(freq: number, at: number, steps: number, vol: number, bell = false) {
  const a = ctx;
  if (!a || !musicGain) return;
  const dur = Math.min(4.5, steps * STEP + 1.6);
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = bell ? 5200 : 2000;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  filter.connect(gain);
  gain.connect(musicGain);
  const parts: [OscillatorType, number, number][] = bell ? [["sine", 1, 1], ["sine", 2.76, 0.3], ["sine", 4.1, 0.12]] : [["triangle", 1, 1], ["sine", 2, 0.25]];
  for (const [type, mult, level] of parts) {
    const g = a.createGain();
    g.gain.value = level;
    g.connect(filter);
    const osc = a.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * mult;
    osc.connect(g);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
}

/** Cuerdas graves: dos dientes de sierra apenas desafinados, filtro cerrado, entrada lenta y vibrato suave. */
function strings(freq: number, at: number, dur: number, vol: number, attack: number) {
  const a = ctx;
  if (!a || !musicGain) return;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(1500, freq * 4);
  filter.Q.value = 0.5;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + attack);
  gain.gain.setValueAtTime(vol, at + Math.max(attack, dur - 1.5));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  filter.connect(gain);
  gain.connect(musicGain);
  const lfo = a.createOscillator();
  lfo.frequency.value = 4.6;
  const lfoGain = a.createGain();
  lfoGain.gain.value = 7;
  lfo.connect(lfoGain);
  for (const det of [-7, 7]) {
    const osc = a.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    osc.detune.value = det;
    lfoGain.connect(osc.detune);
    osc.connect(filter);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
  lfo.start(at);
  lfo.stop(at + dur + 0.05);
}

/** Campanada lejana y grave, como de capilla o cripta. */
function toll(at: number) {
  const a = ctx;
  if (!a || !musicGain) return;
  for (const [mult, vol, dur] of [[1, 0.45, 4], [2.4, 0.16, 3], [3.1, 0.1, 2]] as const) {
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    gain.connect(musicGain);
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 98 * mult;
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
}

function scheduleStep(i: number, at: number) {
  // colchón: cada 2 compases cambia el acorde (cuerdas graves entrando despacio) con una nota grave suave
  if (i % 16 === 0) {
    const pad = PADS[(i / 16) % PADS.length];
    const dur = STEP * 16 + 1;
    strings(midi(pad.root), at, dur, 0.07, 2.2);
    pad.chord.forEach((n) => strings(midi(n), at, dur, 0.035, 2.8));
  }
  // campanada de cripta al empezar el bucle y a la mitad
  if (i === 0 || i === 64) toll(at);
  // melodía
  const t = TUNE_AT.get(i);
  if (t) piano(midi(t[1]), at, t[2], t[3] ? 0.18 : 0.3, t[3]);
}

function musicTick() {
  const a = ctx;
  if (!a || a.state !== "running" || muted) return;
  if (musicNext < a.currentTime - 0.5) musicNext = a.currentTime + 0.05; // la pestaña estuvo dormida: seguimos desde ahora
  while (musicNext < a.currentTime + 0.5) {
    scheduleStep(musicStep, musicNext);
    musicStep = (musicStep + 1) % LOOP;
    musicNext += STEP;
  }
}

export const music = {
  start() {
    const a = audio();
    if (!a || !master || musicTimer) return;
    musicGain = a.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    const wet = a.createGain();
    wet.gain.value = 0.9;
    const conv = reverb(a);
    musicGain.connect(conv);
    conv.connect(wet);
    wet.connect(master);
    musicStep = 0;
    musicNext = a.currentTime + 0.3;
    musicTimer = setInterval(musicTick, 120);
  },
  stop() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    try {
      musicGain?.disconnect();
    } catch {}
    musicGain = null;
  },
};
