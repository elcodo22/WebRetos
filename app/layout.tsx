import type { Metadata } from "next";
import { Bitcount_Grid_Single } from "next/font/google";
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
      <body className={`${bitcount.className} flex min-h-full flex-col antialiased`}>
        {children}
      </body>
    </html>
  );
}
