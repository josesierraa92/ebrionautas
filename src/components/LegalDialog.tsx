"use client";

// Privacidad y términos de uso como pop-up con el diseño de las tarjetas (`CardPanel`). Se abre sobre lo que haya (el aviso de +18,
// la portada) sin salir de la pantalla, y también es lo que enseñan las direcciones /privacidad y /terminos.
import { useState } from "react";
import CardPanel, { CardHeading, CardList, CardNote, CardText, GREEN_LIGHT } from "@/components/CardPanel";

export type LegalKind = "privacidad" | "terminos";

function Privacidad() {
  return (
    <>
      <CardText>Muertos de Sed no pide cuenta, correo ni teléfono. Esto es todo lo que se guarda:</CardText>
      <CardList
        items={[
          <><strong className="text-white">La partida:</strong> los nombres que escribes, lo que pasa en el tablero y lo que se bebe. Se borra sola a las 24 horas y no se usa para nada más.</>,
          <><strong className="text-white">En tu aparato:</strong> que ya dijiste que tienes 18 años o más y el último día que abriste el juego (para no preguntarte cada vez).</>,
          <><strong className="text-white">Contadores anónimos:</strong> cuántas mesas se crean, cuántas partidas empiezan y terminan y cuántos jugadores hay en cada una, sumados por día. No llevan nombres, direcciones IP ni identificadores y no se pueden ligar a una persona.</>,
        ]}
      />
      <CardText>No usamos cookies de publicidad ni vendemos datos.</CardText>
      <CardText>El juego es para mayores de 18 años. Bebe con moderación y no conduzcas si bebiste.</CardText>
    </>
  );
}

function Terminos() {
  return (
    <>
      <CardNote>Última actualización: noviembre de 2026.</CardNote>
      <CardText>
        Al usar <strong className="text-white">Muertos de Sed</strong> aceptas estas reglas. Si no estás de acuerdo, no uses el juego.
      </CardText>

      <CardHeading>1. Solo para mayores de 18</CardHeading>
      <CardText>El juego trata de beber alcohol entre amigos. Solo pueden usarlo personas de 18 años o más, o de la mayoría de edad que marque la ley de su país si es mayor. Al pulsar «Tengo 18 años o más» declaras que cumples ese requisito.</CardText>

      <CardHeading>2. Bebe con responsabilidad</CardHeading>
      <CardList
        items={[
          "Nadie está obligado a beber. Quien no quiera, puede pasar o beber agua.",
          "No conduzcas ni uses maquinaria si bebiste.",
          "No bebas si estás embarazada, tomas medicación incompatible con el alcohol o tienes problemas con la bebida.",
          "Los retos son un juego: nadie debe hacer algo que le resulte peligroso, humillante o contra su voluntad.",
        ]}
      />
      <CardText>Tú decides cuánto y si bebes. El juego no se hace responsable de lo que ocurra durante una partida ni después de ella.</CardText>

      <CardHeading>3. Cómo se usa</CardHeading>
      <CardList
        items={[
          "El juego es para uso personal y entre amigos. No lo uses para molestar, acosar ni engañar a nadie.",
          "No intentes dañar, sobrecargar ni acceder sin permiso al servicio, ni copiar o revender el juego.",
          "Los nombres que escribes para tus jugadores deben ser respetuosos. Podemos eliminar partidas o bloquear usos que rompan estas reglas.",
        ]}
      />

      <CardHeading>4. Contenido y propiedad</CardHeading>
      <CardText>El juego, su diseño, textos y código pertenecen a su creador. Los modelos 3D de decoración y personajes usan kits de licencia libre (CC0) de Kenney (www.kenney.nl) y KayKit, cuyo uso comercial está permitido. Los nombres que escribes son tuyos y solo se guardan mientras dura la partida (24 horas).</CardText>

      <CardHeading>5. Sin garantías</CardHeading>
      <CardText>El juego se ofrece «tal cual». Puede tener errores, cambiar, tener interrupciones o dejar de estar disponible sin aviso. No garantizamos que funcione en todas las pantallas o televisores, y las partidas se borran solas a las 24 horas.</CardText>

      <CardHeading>6. Responsabilidad</CardHeading>
      <CardText>En la medida que permita la ley, el creador no responde por daños derivados del uso del juego, del consumo de alcohol ni de lo que hagan los jugadores.</CardText>

      <CardHeading>7. Compras</CardHeading>
      <CardText>Hoy el juego es gratuito. Si en el futuro hay contenido de pago, sus precios y condiciones se mostrarán antes de comprar y se añadirán a estos términos.</CardText>

      <CardHeading>8. Cambios</CardHeading>
      <CardText>Podemos actualizar estos términos. Seguir usando el juego después de un cambio significa que lo aceptas. Cómo tratamos tus datos está en la política de privacidad.</CardText>
    </>
  );
}

const CONTENT: Record<LegalKind, { kicker: string; title: string; icon: "eye" | "scales" }> = {
  privacidad: { kicker: "Tus datos", title: "Privacidad", icon: "eye" },
  terminos: { kicker: "Las reglas", title: "Términos de uso", icon: "scales" },
};

export default function LegalDialog({ kind, onClose }: { kind: LegalKind; onClose: () => void }) {
  const [current, setCurrent] = useState<LegalKind>(kind);
  const other: LegalKind = current === "privacidad" ? "terminos" : "privacidad";
  const c = CONTENT[current];
  return (
    <CardPanel
      kicker={c.kicker}
      title={c.title}
      icon={c.icon}
      onClose={onClose}
      label={c.title}
      actions={
        <>
          <button onClick={onClose} className="btn-game bg-btn-green py-3 text-xl text-white">
            CERRAR
          </button>
          <button onClick={() => setCurrent(other)} className="font-display text-sm uppercase underline" style={{ color: GREEN_LIGHT }}>
            Ver {CONTENT[other].title.toLowerCase()}
          </button>
        </>
      }
    >
      {current === "privacidad" ? <Privacidad /> : <Terminos />}
    </CardPanel>
  );
}
