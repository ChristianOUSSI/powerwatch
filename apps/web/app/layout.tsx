import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ui/ServiceWorkerRegistrar";
import { BottomNav } from "@/components/ui/BottomNav";
import { PwaInstallPrompt } from "@/components/ui/PwaInstallPrompt";
import { PushOptIn } from "@/components/ui/PushOptIn";

export const metadata: Metadata = {
  title: "PowerWatch Cameroun",
  description: "Suivi en temps réel des coupures d'électricité au Cameroun",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PowerWatch" },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",   // couvre toute la surface (Redmi punch-hole)
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      {/* pb-[calc(4rem+env(safe-area-inset-bottom))] = espace nav + barre système Android */}
      <body className="bg-zinc-950 text-zinc-100 antialiased" style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}>
        <ServiceWorkerRegistrar />
        <PwaInstallPrompt />
        <PushOptIn />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
