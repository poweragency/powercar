import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ThemeProvider, type Theme } from "@/components/ThemeProvider";
import { ThemedToaster } from "@/components/ThemedToaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CRM Officina",
  description: "Gestione lead e pratiche officina/carrozzeria",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("crm-theme")?.value;
  const initialTheme: Theme = themeCookie === "light" ? "light" : "dark";

  return (
    <html
      lang="it"
      data-theme={initialTheme}
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider initialTheme={initialTheme}>
          <ConfirmProvider>{children}</ConfirmProvider>
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
