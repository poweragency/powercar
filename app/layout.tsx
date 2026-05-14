import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Officina",
  description: "Gestione lead e pratiche officina/carrozzeria",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
