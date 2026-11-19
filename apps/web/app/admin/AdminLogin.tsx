"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";

export function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token } = await apiFetch<{ token: string }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(token);
      onLogin();
    } catch (err: any) {
      setError(err.message ?? "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 10h-6.5L13 2z"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold text-orange-400 mt-2">PowerWatch Admin</h1>
        </div>
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
