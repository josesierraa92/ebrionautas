import type { Metadata, Viewport } from "next";
import { Creepster, Fredoka, Lilita_One } from "next/font/google";
import "./globals.css";

const display = Lilita_One({
  variable: "--font-lilita",
  weight: "400",
  subsets: ["latin"],
});

// Letra de terror para los títulos grandes de la TV
const spooky = Creepster({
  variable: "--font-spooky",
  weight: "400",
  subsets: ["latin"],
});

const body = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Muertos de Sed",
  description:
    "Muertos de Sed: el juego de mesa para beber del Día de Muertos. Vuelve a tu tumba antes del amanecer.",
};

export const viewport: Viewport = {
  themeColor: "#1b1f4b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable} ${spooky.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
