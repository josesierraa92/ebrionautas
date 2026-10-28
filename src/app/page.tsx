import HomeActions from "@/components/HomeActions";

// Pantalla de inicio: la portada del juego (public/art/portada.webp, ya trae el logo «Muertos de Sed»). En horizontal
// (TV, portátil) ocupa toda la pantalla y los botones van abajo en una fila; en vertical (celular) la portada va arriba
// a todo el ancho y los botones debajo.
export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col bg-[#0a0620] landscape:h-dvh landscape:justify-end landscape:overflow-hidden">
      <div className="relative landscape:contents">
        <img
          src="/art/portada.webp"
          alt="Muertos de Sed"
          fetchPriority="high"
          className="w-full portrait:h-auto landscape:absolute landscape:inset-0 landscape:h-full landscape:object-cover"
        />
        {/* en vertical, la portada se funde con el fondo de los botones */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0a0620] to-transparent landscape:hidden" />
      </div>
      {/* oscurece el fondo hacia abajo para que se lean los botones */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[34%] bg-gradient-to-t from-[#0a0620] via-[#0a0620]/80 to-transparent landscape:block" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hidden h-[30%] bg-gradient-to-b from-[#0a0620]/40 to-transparent landscape:block" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center gap-5 px-4 pb-8 text-center portrait:-mt-6 landscape:max-w-5xl landscape:gap-2 landscape:pb-3">
        <p className="font-display text-lg text-btn-yellow drop-shadow-[0_2px_0_rgba(0,0,0,.6)] landscape:text-xl">Una noche para beber. Toda la eternidad para dormirla.</p>
        <HomeActions />
        <p className="text-xs text-white/60">Juego para mayores de 18 años. Bebe con moderación.</p>
      </div>
    </main>
  );
}
