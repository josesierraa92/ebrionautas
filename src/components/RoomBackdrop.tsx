// Fondo de las pantallas de sala y de alta de jugadores: el cementerio oscuro (public/art/fondo-sala.webp) a toda la pantalla,
// con un degradado morado encima (el mismo estilo del resto del juego) para que las tarjetas se lean.
export default function RoomBackdrop() {
  return (
    <>
      <img src="/art/fondo-sala.webp" alt="" aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(60,40,150,.18), rgba(10,6,40,0) 55%, rgba(10,6,32,.35) 100%)" }} />
    </>
  );
}
