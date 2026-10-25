// El Marciano: un único cuerpo base que se personaliza por capas (ver plan §3).

import type { Player } from "./engine";

export const SKINS = [
  "#5cd23c", "#2f7bf5", "#e53fd6", "#ffc61a", "#e8344a", "#00d1c1",
  "#ff8a1f", "#9b5de5", "#7fd3ff", "#b8f35a", "#ff9ecb", "#c0c7d6",
] as const;
export const EYES = ["redondos", "saltones", "dormilones", "ciclope"] as const;
export const MOUTHS = ["sonrisa", "dientes", "lengua", "sorpresa"] as const;
export const PATTERNS = ["liso", "manchas", "rayas", "escamas"] as const;
export const COSTUMES = ["marciano", "oca", "preso", "calavera", "mago", "pirata"] as const;

export const COSTUME_NAMES: Record<Costume, string> = {
  marciano: "Marciano",
  oca: "La Oca",
  preso: "El Preso",
  calavera: "Calavera Mariachi",
  mago: "Mago Puñetero",
  pirata: "Pirata",
};

export type Eyes = (typeof EYES)[number];
export type Mouth = (typeof MOUTHS)[number];
export type Pattern = (typeof PATTERNS)[number];
export type Costume = (typeof COSTUMES)[number];

export type AvatarConfig = {
  skin: string;
  eyes: Eyes;
  mouth: Mouth;
  pattern: Pattern;
  costume: Costume;
};

export type Expression = "normal" | "feliz" | "mareado" | "triste" | "abducido" | "chulo" | "euforico";

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: SKINS[0],
  eyes: "redondos",
  mouth: "sonrisa",
  pattern: "liso",
  costume: "marciano",
};

const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback;

/** Valida un avatar recibido del cliente: cualquier valor desconocido vuelve al de por defecto. */
export function sanitizeAvatar(raw: unknown, fallbackSkin: string = DEFAULT_AVATAR.skin): AvatarConfig {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    skin: oneOf(SKINS, a.skin, oneOf(SKINS, fallbackSkin, DEFAULT_AVATAR.skin)),
    eyes: oneOf(EYES, a.eyes, DEFAULT_AVATAR.eyes),
    mouth: oneOf(MOUTHS, a.mouth, DEFAULT_AVATAR.mouth),
    pattern: oneOf(PATTERNS, a.pattern, DEFAULT_AVATAR.pattern),
    costume: oneOf(COSTUMES, a.costume, DEFAULT_AVATAR.costume),
  };
}

/** Avatar de relleno para jugadores sin perfil (modo local): cada uno con un disfraz distinto. */
export function defaultAvatar(index: number, skin: string): AvatarConfig {
  return {
    ...DEFAULT_AVATAR,
    skin: oneOf(SKINS, skin, SKINS[index % SKINS.length]),
    costume: COSTUMES[index % COSTUMES.length],
    eyes: EYES[index % EYES.length],
    mouth: MOUTHS[(index + 1) % MOUTHS.length],
  };
}

/** Cara del Marciano según cómo le va en la partida. */
export function expressionFor(p: Player, opts: { winner?: string | null; isTurn?: boolean } = {}): Expression {
  if (opts.winner === p.id) return "euforico";
  if (p.status.carcel || p.status.laberinto) return "triste";
  if (p.status.hipnosis) return "abducido";
  if (p.status.inmune) return "chulo";
  if ((p.pending ?? 0) >= 5) return "mareado";
  if (opts.isTurn) return "feliz";
  return "normal";
}

/** Avatar de un jugador; las partidas guardadas antes de la Fase 4 no lo traen. */
export function avatarOf(p: Pick<Player, "avatar" | "color" | "id">): AvatarConfig {
  return p.avatar ?? defaultAvatar(parseInt(p.id.slice(1), 10) - 1 || 0, p.color);
}
