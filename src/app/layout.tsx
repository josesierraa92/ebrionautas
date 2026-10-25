import type { Metadata, Viewport } from "next";
import { Fredoka, Lilita_One } from "next/font/google";
import "./globals.css";

const display = Lilita_One({
  variable: "--font-lilita",
  weight: "400",
  subsets: ["latin"],
});

const body = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ebrionautas",
  description:
    "Encuentros en la Tercera Copa: el juego de mesa de extraterrestres borrachos.",
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
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
