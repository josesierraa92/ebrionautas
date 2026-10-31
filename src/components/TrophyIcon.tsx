// Copa amarilla en estilo low poly (facetas planas de oro): se usa en vez del emoji 🏆 en todo el juego (PC y celular).
const F = {
  a: "#fff0a6", b: "#ffd84a", c: "#f6b92b", d: "#e09a14", e: "#c47d0c", f: "#ffe27a",
};

export default function TrophyIcon({ size = 24, className = "" }: { size?: number | string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden focusable="false" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <g strokeLinejoin="round" stroke="#7a4a05" strokeWidth="1" strokeOpacity=".55">
        {/* asas */}
        <polygon points="17,10 7,12 6,22 15,31 21,28 14,21 14,15" fill={F.e} />
        <polygon points="7,12 6,22 11,20 12,13" fill={F.d} />
        <polygon points="47,10 57,12 58,22 49,31 43,28 50,21 50,15" fill={F.e} />
        <polygon points="57,12 58,22 53,20 52,13" fill={F.c} />
        {/* copa: abanico de triángulos desde el borde */}
        <polygon points="32,8 16,8 20,24" fill={F.a} />
        <polygon points="32,8 20,24 26,36" fill={F.f} />
        <polygon points="32,8 26,36 32,41" fill={F.b} />
        <polygon points="32,8 32,41 38,36" fill={F.c} />
        <polygon points="32,8 38,36 44,24" fill={F.d} />
        <polygon points="32,8 44,24 48,8" fill={F.c} />
        {/* tallo */}
        <polygon points="32,41 28,49 32,51" fill={F.c} />
        <polygon points="32,41 32,51 36,49" fill={F.e} />
        {/* base */}
        <polygon points="24,50 40,50 44,56 20,56" fill={F.d} />
        <polygon points="24,50 32,50 32,56 20,56" fill={F.c} />
        <polygon points="18,56 46,56 48,60 16,60" fill={F.e} />
        <polygon points="18,56 32,56 32,60 16,60" fill={F.d} />
      </g>
      {/* destello del borde */}
      <polygon points="18,9 24,9 21,15" fill="#fff" opacity=".55" />
    </svg>
  );
}
