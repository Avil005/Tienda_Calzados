import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Importadora ABC (Pampili)",
  description: "Sistema de información para la distribución de calzados",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
