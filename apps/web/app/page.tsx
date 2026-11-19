import dynamic from "next/dynamic";
import { ReportButton } from "@/components/report/ReportButton";
import { ZoneStatusBar } from "@/components/ui/ZoneStatusBar";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Onboarding } from "@/components/ui/Onboarding";
import { ElectricBar } from "@/components/ui/ElectricBar";

// Leaflet ne tourne pas côté serveur
const PowerMap = dynamic(() => import("@/components/map/PowerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-zinc-950 px-10">
      <div className="w-full max-w-xs space-y-3">
        <ElectricBar label="Chargement de la carte…" />
      </div>
    </div>
  ),
});

export default function HomePage() {
  return (
    <main className="flex flex-col" style={{ height: "100dvh", maxHeight: "100dvh", overflow: "hidden" }}>
      {/* Alerte officielle ENEO */}
      <AlertBanner />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10h-6.5L13 2z"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-sm leading-none">PowerWatch</span>
            <span className="text-[10px] text-zinc-500 block leading-none mt-0.5">Cameroun</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <ZoneStatusBar />
        </div>
      </header>

      {/* Carte */}
      <div className="flex-1 relative min-h-0">
        <PowerMap />
      </div>

      {/* FAB signalement */}
      <ReportButton />

      {/* Bouton WhatsApp */}
      <WhatsAppButton />

      {/* Aide premier lancement */}
      <Onboarding />
    </main>
  );
}
