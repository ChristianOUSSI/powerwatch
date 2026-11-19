"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, isLoggedIn } from "@/lib/auth";
import { adminFetch } from "@/lib/api";
import { AdminStats } from "./AdminStats";
import { AdminReportsList } from "./AdminReportsList";
import { AdminAlertForm } from "./AdminAlertForm";
import { AdminSpotsList } from "./AdminSpotsList";
import { AdminLogin } from "./AdminLogin";

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(isLoggedIn());
  }, []);

  if (authed === null) return null; // hydration guard

  if (!authed) {
    return <AdminLogin onLogin={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orange-400 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10h-6.5L13 2z"/>
            </svg>
            PowerWatch · Admin
          </h1>
          <p className="text-xs text-zinc-500">Tableau de bord modération</p>
        </div>
        <button
          onClick={() => { import("@/lib/auth").then(m => m.clearToken()); setAuthed(false); }}
          className="text-xs text-zinc-500 hover:text-red-400 transition"
        >
          Déconnexion
        </button>
      </div>

      {/* Stats globales */}
      <AdminStats />

      {/* Onglets */}
      <AdminTabs />
    </div>
  );
}

function AdminTabs() {
  const [tab, setTab] = useState<"reports" | "alerts" | "spots">("reports");

  return (
    <div>
      <div className="flex gap-2 border-b border-zinc-800 mb-4">
        {(["reports", "alerts", "spots"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              tab === t
                ? "border-orange-400 text-orange-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "reports" ? "Signalements" : t === "alerts" ? "Alertes ENEO" : "Lieux de charge"}
          </button>
        ))}
      </div>
      {tab === "reports" ? <AdminReportsList /> : tab === "alerts" ? <AdminAlertForm /> : <AdminSpotsList />}
    </div>
  );
}
