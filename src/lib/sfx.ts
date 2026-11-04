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
// Un bucle de 8 compases, sintetizado (sin archivos ni licencias): caja de música y bajo pizzicato en La menor con un paso por Mi mayor
// (el sol sostenido da el toque de misterio) y acordes cortos a contratiempo. Es de videojuego: saltarín y alegre, con un poquito de
// terror por la caja de música y el modo menor. Va muy bajito para no tapar los efectos ni la charla.

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const BPM = 104;
const STEP = 60 / BPM / 2; // una corchea
// por compás: raíz del bajo, quinta y acorde (a contratiempo)
const BARS: { root: number; fifth: number; chord: number[] }[] = [
  { root: 45, fifth: 52, chord: [57, 60, 64] }, // La menor
  { root: 41, fifth: 48, chord: [57, 60, 65] }, // Fa
  { root: 48, fifth: 55, chord: [55, 60, 64] }, // Do
  { root: 40, fifth: 47, chord: [56, 59, 64] }, // Mi (con sol sostenido)
  { root: 45, fifth: 52, chord: [57, 60, 64] },
  { root: 41, fifth: 48, chord: [57, 60, 65] },
  { root: 38, fifth: 45, chord: [57, 62, 65] }, // Re menor
  { root: 40, fifth: 47, chord: [56, 59, 64] },
];
// melodía en corcheas (0 = silencio), 8 por compás
const MELODY = [
  76, 0, 72, 0, 69, 72, 76, 0,
  77, 0, 74, 0, 72, 0, 69, 0,
  72, 76, 79, 0, 76, 72, 67, 0,
  76, 0, 80, 0, 83, 80, 76, 0,
  81, 0, 76, 0, 72, 0, 76, 0,
  77, 76, 74, 0, 72, 0, 69, 0,
  74, 0, 77, 0, 81, 77, 74, 0,
  80, 0, 76, 0, 71, 0, 76, 0,
];

let musicGain: GainNode | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;
let musicNext = 0;

function note(freq: number, at: number, dur: number, type: OscillatorType, vol: number, bell = false) {
  const a = ctx;
  if (!a || !musicGain) return;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  gain.connect(musicGain);
  const osc = a.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  osc.start(at);
  osc.stop(at + dur + 0.05);
  if (bell) {
    // armónico metálico que se apaga rápido: suena a caja de música
    const g2 = a.createGain();
    g2.gain.setValueAtTime(0.0001, at);
    g2.gain.exponentialRampToValueAtTime(vol * 0.35, at + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.4);
    g2.connect(musicGain);
    const o2 = a.createOscillator();
    o2.type = "sine";
    o2.frequency.value = freq * 2.76;
    o2.connect(g2);
    o2.start(at);
    o2.stop(at + dur * 0.4 + 0.05);
  }
}

/** Violín: dos dientes de sierra apenas desafinados (efecto de sección de cuerdas), filtro suave y vibrato lento. */
function violin(freq: number, at: number, dur: number, vol: number, attack = 0.07) {
  const a = ctx;
  if (!a || !musicGain) return;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(3200, freq * 5);
  filter.Q.value = 0.6;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + attack);
  gain.gain.setValueAtTime(vol, at + Math.max(attack, dur - 0.18));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  filter.connect(gain);
  gain.connect(musicGain);
  const lfo = a.createOscillator();
  lfo.frequency.value = 5.4;
  const lfoGain = a.createGain();
  lfoGain.gain.value = 9; // cents de vibrato
  lfo.connect(lfoGain);
  for (const det of [-6, 6]) {
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

/** Campanada lejana y grave, como de capilla o cripta: suena muy de vez en cuando. */
function toll(at: number) {
  const a = ctx;
  if (!a || !musicGain) return;
  for (const [mult, vol, dur] of [[1, 0.5, 3.4], [2.4, 0.2, 2.4], [3.1, 0.12, 1.6]] as const) {
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    gain.connect(musicGain);
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 110 * mult;
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
}

function scheduleStep(i: number, at: number) {
  const bar = BARS[Math.floor(i / 8) % BARS.length];
  const beat = i % 8;
  const barNo = Math.floor(i / 8) % BARS.length;
  // bajo pizzicato: raíz en el 1, quinta en el 3 (corcheas 0 y 4), saltito en el 6
  if (beat === 0) note(midi(bar.root), at, 0.32, "triangle", 0.5);
  if (beat === 4) note(midi(bar.fifth), at, 0.28, "triangle", 0.4);
  if (beat === 6) note(midi(bar.root + 12), at, 0.16, "triangle", 0.22);
  // sección de cuerdas: el acorde del compás sostenido, entrando despacio
  if (beat === 0) bar.chord.forEach((n) => violin(midi(n - 12), at, STEP * 8, 0.05, 0.35));
  // campanada grave en la entrada y a mitad del bucle (la cripta)
  if (beat === 0 && (barNo === 0 || barNo === 4)) toll(at);
  // violín solista: cada nota dura hasta la siguiente (máximo 3 corcheas), ligada
  const m = MELODY[i % MELODY.length];
  if (m) {
    let len = 1;
    while (len < 3 && !MELODY[(i + len) % MELODY.length] && (i + len) % 8 !== 0) len++;
    violin(midi(m - 12 + (m < 72 ? 12 : 0)), at, STEP * len + 0.08, 0.1);
  }
}

function musicTick() {
  const a = ctx;
  if (!a || a.state !== "running" || muted) return;
  if (musicNext < a.currentTime - 0.5) musicNext = a.currentTime + 0.05; // la pestaña estuvo dormida: seguimos desde ahora
  while (musicNext < a.currentTime + 0.5) {
    scheduleStep(musicStep, musicNext);
    musicStep = (musicStep + 1) % (MELODY.length);
    musicNext += STEP;
  }
}

export const music = {
  start() {
    const a = audio();
    if (!a || !master || musicTimer) return;
    musicGain = a.createGain();
    musicGain.gain.value = 0.2;
    musicGain.connect(master);
    musicStep = 0;
    musicNext = a.currentTime + 0.1;
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
