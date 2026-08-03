import type { Metadata } from "next";
import { Bitcount_Grid_Single } from "next/font/google";
import { CrtShell } from "@/components/layout/crt-shell";
import { CrtPowerProvider } from "@/components/layout/crt-power-transition";
import { SearchOverlayProvider } from "@/components/archivos/search-overlay-provider";
import { DiccionarioProvider } from "@/components/diccionario/diccionario-provider";
import "./globals.css";

const bitcount = Bitcount_Grid_Single({
  variable: "--font-bitcount",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Retos Audiovisuales",
  description: "Plataforma de retos audiovisuales con límite de tiempo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${bitcount.variable} h-full`}>
      <body className={`${bitcount.className} crt-body antialiased`}>
        <CrtShell>
          <CrtPowerProvider>
            <SearchOverlayProvider>
              <DiccionarioProvider>{children}</DiccionarioProvider>
            </SearchOverlayProvider>
          </CrtPowerProvider>
        </CrtShell>
      </body>
    </html>
  );
}
