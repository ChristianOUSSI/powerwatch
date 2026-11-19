// Client API centralisé
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BASE = API_URL;

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    // err.error peut être un objet (zod flatten) : on prend le premier message lisible
    const message =
      typeof err.error === "string"
        ? err.error
        : err.error?.formErrors?.[0] ??
          Object.values(err.error ?? {})?.flat?.()?.[0] ??
          "Erreur API";
    const e = new Error(message) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  return res.json();
}

export async function adminFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  try {
    return await apiFetch<T>(path, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options?.headers },
    });
  } catch (err) {
    // Token expiré ou révoqué : retour à l'écran de login
    if ((err as { status?: number }).status === 401 && typeof window !== "undefined") {
      const { clearToken } = await import("@/lib/auth");
      clearToken();
      window.location.href = "/admin";
    }
    throw err;
  }
}
