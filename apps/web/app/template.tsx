import { ElectricBar } from "@/components/ui/ElectricBar";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Barre de chargement électrique en haut à chaque changement de page */}
      <div className="page-loader pointer-events-none fixed inset-x-0 top-0 z-[2000] px-3 pt-1">
        <ElectricBar />
      </div>
      <div className="page-enter">{children}</div>
    </>
  );
}
