import HomeActions from "@/components/HomeActions";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-10 px-4 py-12 text-center">
      <div className="text-7xl" aria-hidden>
        💀🥃
      </div>
      <div>
        <h1 className="title-game text-[13vw] leading-none sm:text-7xl">
          MUERTOS DE SED
        </h1>
        <p className="mt-4 font-display text-xl text-btn-yellow">
          Una noche para beber. Toda la eternidad para dormirla.
        </p>
      </div>

      <HomeActions />

      <p className="text-sm text-white/60">
        Juego para mayores de 18 años. Bebe con moderación.
      </p>
    </main>
  );
}
