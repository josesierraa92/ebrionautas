import LegalRoute from "@/components/LegalRoute";

export const metadata = { title: "Términos de uso · Muertos de Sed" };

// El contenido vive en `components/LegalDialog.tsx`. Antes de cobrar conviene que lo revise un abogado: falta la ley aplicable y un correo de contacto.
export default function Terminos() {
  return <LegalRoute kind="terminos" />;
}
