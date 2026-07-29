import type { Metadata } from "next";
import { Bitcount_Grid_Single } from "next/font/google";
import { CrtShell } from "@/components/layout/crt-shell";
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
        <CrtShell>{children}</CrtShell>
      </body>
    </html>
  );
}
