import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-10 px-4 py-12 text-center">
      <div className="text-7xl" aria-hidden>
        👽🍷
      </div>
      <div>
        <h1 className="title-game text-[13vw] leading-none sm:text-7xl">
          EBRIONAUTAS
        </h1>
        <p className="mt-4 font-display text-xl text-btn-yellow">
          Encuentros en la Tercera Copa
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <Link href="/jugar" className="btn-game bg-btn-green py-4 text-2xl text-white">
          CREAR MESA
        </Link>
        <button className="btn-game bg-btn-grey py-3 text-lg text-white" disabled>
          UNIRSE CON CÓDIGO (próximamente)
        </button>
      </div>

      <p className="text-sm text-white/60">
        Juego para mayores de 18 años. Bebe con moderación.
      </p>
    </main>
  );
}
