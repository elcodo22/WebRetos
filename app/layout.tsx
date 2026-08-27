import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { CrtShell } from "@/components/layout/crt-shell";
import { CrtPowerProvider } from "@/components/layout/crt-power-transition";
import { BootSplash } from "@/components/layout/boot-splash";
import { SearchOverlayProvider } from "@/components/archivos/search-overlay-provider";
import { DiccionarioProvider } from "@/components/diccionario/diccionario-provider";
import "./globals.css";

const ppNeueBit = localFont({
  src: [
    {
      path: "../public/fonts/PPNeueBit-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/PPNeueBit-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-pp-neue-bit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Retos Audiovisuales",
  description: "Plataforma de retos audiovisuales con límite de tiempo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Retos Audiovisuales",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#006eff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${ppNeueBit.variable} h-full`}>
      <body className={`${ppNeueBit.className} crt-body antialiased`}>
        <CrtShell>
          <CrtPowerProvider>
            <BootSplash>
              <SearchOverlayProvider>
                <DiccionarioProvider>{children}</DiccionarioProvider>
              </SearchOverlayProvider>
            </BootSplash>
          </CrtPowerProvider>
        </CrtShell>
      </body>
    </html>
  );
}
