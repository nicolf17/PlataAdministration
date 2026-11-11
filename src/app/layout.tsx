import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import { PwaRegister } from "@/components/pwa-register";
import { Shell } from "@/components/shell";
import { WebVitals } from "@/components/web-vitals";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plata — finanzas personales",
  description:
    "Llevá tus cuentas, ingresos, gastos y presupuestos. Recomendaciones explicables, sin planillas.",
  applicationName: "Plata",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Plata",
    // "black-translucent" hacía que la app se dibujara POR DEBAJO de la barra
    // de estado: el header quedaba comido arriba y se veía como difuminado.
    statusBarStyle: "black",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#070b10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Suspense fallback={null}>
          <Shell>{children}</Shell>
        </Suspense>
        <PwaRegister />
        <WebVitals />
      </body>
    </html>
  );
}
