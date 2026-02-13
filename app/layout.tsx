import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PinProtection } from "@/components/PinProtection";
import { ToastProvider } from "@/components/ui/ToastContainer";

export const metadata: Metadata = {
  title: "Macros & Peso",
  description: "Track your macros and weight",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>
          <PinProtection>{children}</PinProtection>
        </ToastProvider>
      </body>
    </html>
  );
}
