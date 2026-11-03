import Link from "next/link";

export const metadata = { title: "Términos de uso · Muertos de Sed" };

// Términos básicos del juego. Si se añaden cuentas, compras o publicidad, hay que actualizarlos (y la página de privacidad).
// Antes de cobrar conviene que los revise un abogado: falta la ley aplicable y un correo de contacto.
export default function Terminos() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 bg-[#0a0620] px-5 py-8 text-white/85">
      <h1 className="font-display text-3xl text-btn-yellow">Términos de uso</h1>
      <p className="text-sm text-white/55">Última actualización: noviembre de 2026.</p>
      <p>
        Al usar <strong>Muertos de Sed</strong> aceptas estas reglas. Si no estás de acuerdo, no uses el juego.
      </p>

      <h2 className="font-display text-xl text-btn-yellow">1. Solo para mayores de 18</h2>
      <p>El juego trata de beber alcohol entre amigos. Solo pueden usarlo personas de 18 años o más, o de la mayoría de edad que marque la ley de su país si es mayor. Al pulsar «Tengo 18 años o más» declaras que cumples ese requisito.</p>

      <h2 className="font-display text-xl text-btn-yellow">2. Bebe con responsabilidad</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Nadie está obligado a beber. Quien no quiera, puede pasar o beber agua.</li>
        <li>No conduzcas ni uses maquinaria si bebiste.</li>
        <li>No bebas si estás embarazada, tomas medicación incompatible con el alcohol o tienes problemas con la bebida.</li>
        <li>Los retos son un juego: nadie debe hacer algo que le resulte peligroso, humillante o contra su voluntad.</li>
      </ul>
      <p>Tú decides cuánto y si bebes. El juego no se hace responsable de lo que ocurra durante una partida ni después de ella.</p>

      <h2 className="font-display text-xl text-btn-yellow">3. Cómo se usa</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>El juego es para uso personal y entre amigos. No lo uses para molestar, acosar ni engañar a nadie.</li>
        <li>No intentes dañar, sobrecargar ni acceder sin permiso al servicio, ni copiar o revender el juego.</li>
        <li>Los nombres que escribes para tus jugadores deben ser respetuosos. Podemos eliminar partidas o bloquear usos que rompan estas reglas.</li>
      </ul>

      <h2 className="font-display text-xl text-btn-yellow">4. Contenido y propiedad</h2>
      <p>
        El juego, su diseño, textos y código pertenecen a su creador. Los modelos 3D de decoración y personajes usan kits de licencia libre (CC0) de Kenney (www.kenney.nl) y KayKit, cuyo uso comercial está permitido. Los nombres que escribes son tuyos y solo se guardan mientras dura la partida (24 horas).
      </p>

      <h2 className="font-display text-xl text-btn-yellow">5. Sin garantías</h2>
      <p>El juego se ofrece «tal cual». Puede tener errores, cambiar, tener interrupciones o dejar de estar disponible sin aviso. No garantizamos que funcione en todas las pantallas o televisores, y las partidas se borran solas a las 24 horas.</p>

      <h2 className="font-display text-xl text-btn-yellow">6. Responsabilidad</h2>
      <p>En la medida que permita la ley, el creador no responde por daños derivados del uso del juego, del consumo de alcohol ni de lo que hagan los jugadores.</p>

      <h2 className="font-display text-xl text-btn-yellow">7. Compras</h2>
      <p>Hoy el juego es gratuito. Si en el futuro hay contenido de pago, sus precios y condiciones se mostrarán antes de comprar y se añadirán a estos términos.</p>

      <h2 className="font-display text-xl text-btn-yellow">8. Cambios</h2>
      <p>Podemos actualizar estos términos. Seguir usando el juego después de un cambio significa que lo aceptas. Cómo tratamos tus datos está en la página de privacidad.</p>

      <p className="flex gap-4 pt-2">
        <Link href="/privacidad" className="underline">
          Privacidad
        </Link>
        <Link href="/" className="underline">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}
