import LegalRoute from "@/components/LegalRoute";

export const metadata = { title: "Privacidad · Muertos de Sed" };

// El contenido vive en `components/LegalDialog.tsx`. Si se añade algo nuevo (cuentas, pagos, otro proveedor de analíticas), actualizarlo allí.
export default function Privacidad() {
  return <LegalRoute kind="privacidad" />;
}
