import Link from "next/link";

export const metadata = { title: "Privacidad · Muertos de Sed" };

// Qué se guarda y qué no. Si se añade algo nuevo (cuentas, pagos, analíticas de otro proveedor), actualizar esta página.
export default function Privacidad() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 bg-[#0a0620] px-5 py-8 text-white/85">
      <h1 className="font-display text-3xl text-btn-yellow">Privacidad</h1>
      <p>Muertos de Sed no pide cuenta, correo ni teléfono. Esto es todo lo que se guarda:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>La partida:</strong> los nombres que escribes, lo que pasa en el tablero y lo que se bebe. Se borra sola a las 24 horas y no se usa para nada más.
        </li>
        <li>
          <strong>En tu aparato:</strong> que ya dijiste que tienes 18 años o más y el último día que abriste el juego (para no preguntarte cada vez).
        </li>
        <li>
          <strong>Contadores anónimos:</strong> cuántas mesas se crean, cuántas partidas empiezan y terminan y cuántos jugadores hay en cada una, sumados por día. No llevan nombres, direcciones IP ni identificadores y no se pueden ligar a una persona.
        </li>
      </ul>
      <p>No usamos cookies de publicidad ni vendemos datos.</p>
      <p>El juego es para mayores de 18 años. Bebe con moderación y no conduzcas si bebiste.</p>
      <p className="flex gap-4">
        <Link href="/terminos" className="underline">
          Términos de uso
        </Link>
        <Link href="/" className="underline">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}
