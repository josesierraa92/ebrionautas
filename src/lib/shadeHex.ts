/** Aclara (amount > 0) u oscurece (amount < 0) un color #rrggbb. */
export function shadeHex(hex: string, amount: number) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  return `#${((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, "0")}`;
}

/** Los dos extremos del degradado de un jugador: el color vivo y fuerte (neón) y un tono más normal y oscuro. */
export const gradientEnds = (hex: string) => [shadeHex(hex, 0.12), shadeHex(hex, -0.38)] as const;
