import HomeActions from "@/components/HomeActions";
import LegalLinks from "@/components/LegalLinks";

// Pantalla de inicio: la portada del juego (public/art/portada.webp, ya trae el logo «Muertos de Sed»). En horizontal
// (TV, portátil) ocupa toda la pantalla y los botones van abajo en una fila; en vertical (celular) la portada va arriba
// un fondo a toda la pantalla (portada-celular.webp, vertical) y los botones abajo.
export default function Home() {
  return (
    <main className="relative flex h-dvh min-h-dvh flex-col justify-end overflow-hidden bg-[#0a0620]">
      {/* horizontal (TV, PC): la portada ancha; vertical (celular): la portada vertical como fondo de toda la pantalla */}
      <img
        src="/art/portada.webp"
        alt="Muertos de Sed"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover portrait:hidden"
      />
      <img
        src="/art/portada-celular.webp"
        alt="Muertos de Sed"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-top landscape:hidden"
      />
      {/* en vertical, el fondo se oscurece hacia abajo para que se lean los botones */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#0a0620] via-[#0a0620]/75 to-transparent landscape:hidden" />
      {/* oscurece el fondo hacia abajo para que se lean los botones */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[34%] bg-gradient-to-t from-[#0a0620] via-[#0a0620]/80 to-transparent landscape:block" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hidden h-[30%] bg-gradient-to-b from-[#0a0620]/40 to-transparent landscape:block" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center gap-5 px-4 pb-8 text-center landscape:max-w-5xl landscape:gap-2 landscape:pb-3">
        <HomeActions />
        <p className="text-xs text-white/60">
          Juego para mayores de 18 años. Bebe con moderación. · <LegalLinks />
        </p>
      </div>
    </main>
  );
}
