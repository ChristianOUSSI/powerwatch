"use client";

// Barre de chargement fine, style électrique (orange → rouge, glow)
export function ElectricBar({ className = "", label }: { className?: string; label?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full w-1/3 animate-electric rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-400"
          style={{ boxShadow: "0 0 10px rgba(249,115,22,0.9)" }}
        />
      </div>
      {label && <p className="mt-2 text-center text-[10px] text-zinc-500">{label}</p>}
    </div>
  );
}
