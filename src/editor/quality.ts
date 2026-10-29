// Calidad del 3D en vivo según el aparato: un PC potente puede con más luces, 60 fotogramas y mayor resolución; una Smart TV (procesador
// y tarjeta gráfica muy modestos) necesita menos. Se detecta por el navegador y se puede forzar con `?calidad=alta|media|baja`.
// Además, la resolución interna baja sola si el aparato no llega a la velocidad objetivo (ver `EditorScene`).

export type QualityLevel = "alta" | "media" | "baja";

export type Quality = {
  level: QualityLevel;
  /** Por qué se eligió (se enseña con `?debug`). */
  why: string;
  /** Focos de verdad a la vez (los faroles más cercanos a la cámara; la cantidad no cambia para no recompilar shaders). */
  lights: number;
  /** Fotogramas por segundo objetivo. */
  fps: number;
  /** Ancho máximo de la imagen interna en píxeles reales (una pantalla mayor se escala sola). */
  maxWidth: number;
  /** Tamaño del mapa de sombras. */
  shadowSize: number;
};

const PROFILES: Record<QualityLevel, Omit<Quality, "level" | "why">> = {
  alta: { lights: 6, fps: 60, maxWidth: 2560, shadowSize: 4096 },
  media: { lights: 4, fps: 30, maxWidth: 1920, shadowSize: 2048 },
  baja: { lights: 2, fps: 30, maxWidth: 1920, shadowSize: 2048 },
};

/** Marcas de navegador de Smart TV, decodificadores y consolas. */
const TV_UA = /smart-?tv|tizen|web0s|webos|hbbtv|netcast|viera|bravia|aquos|vidaa|hisense|crkey|googletv|android ?tv|appletv|roku|fire ?tv|\baft[a-z]{1,3}\b|\btv\b|maple|opera tv|philipstv|nettv|large screen|playstation|xbox|nintendo/i;

/** Pura (para probarla): elige el nivel con los datos del navegador. */
export function qualityFor(input: { ua: string; search?: string; cores?: number; memory?: number; touch?: boolean }): Quality {
  const forced = new URLSearchParams(input.search ?? "").get("calidad");
  const make = (level: QualityLevel, why: string): Quality => ({ level, why, ...PROFILES[level] });
  if (forced === "alta" || forced === "media" || forced === "baja") return make(forced, "forzada con ?calidad");
  if (TV_UA.test(input.ua)) return make("baja", "Smart TV");
  if (/android|iphone|ipad|mobile/i.test(input.ua) || input.touch) return make("media", "móvil o tableta");
  const weak = (input.cores !== undefined && input.cores <= 4) || (input.memory !== undefined && input.memory <= 4);
  return weak ? make("media", "PC modesto") : make("alta", "PC");
}

let cached: Quality | null = null;
/** La calidad de este aparato (se decide una vez por carga de página). */
export function viewerQuality(): Quality {
  if (cached) return cached;
  const nav = navigator as Navigator & { deviceMemory?: number };
  cached = qualityFor({ ua: nav.userAgent, search: location.search, cores: nav.hardwareConcurrency, memory: nav.deviceMemory, touch: nav.maxTouchPoints > 1 && !/windows|macintosh|linux x86/i.test(nav.userAgent) });
  return cached;
}
