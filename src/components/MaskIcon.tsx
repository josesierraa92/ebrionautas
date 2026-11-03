"use client";

import { useEffect, useState } from "react";
import { iconMaskUrl, type IconName } from "@/editor/icons";

/** Icono vectorial del juego (los de las casillas) pintado de un solo color. `size` en cualquier unidad CSS. */
export default function MaskIcon({ name, color = "#fff", size = "1em", className = "" }: { name: IconName; color?: string; size?: string; className?: string }) {
  // la máscara se dibuja en un canvas: solo existe en el navegador
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => setUrl(iconMaskUrl(name, 96)), [name]);
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        ...(url ? { WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" } : { opacity: 0 }),
      }}
    />
  );
}
