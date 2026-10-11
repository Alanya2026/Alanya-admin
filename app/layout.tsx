import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Providers } from "./providers";
import "./globals.css";

// Polices locales (Geist, Caveat) — aucun appel réseau, build reproductible hors-ligne / CI.
const sans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const handwriting = localFont({
  src: "./fonts/CaveatVF.woff2",
  variable: "--font-handwriting",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alanya Admin",
  description: "Tableau de bord d'administration Alanya",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${sans.variable} ${handwriting.variable}`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
