"use client";

import { openDB } from "idb";
import type { ReportPayload } from "@powerwatch/shared";

const DB_NAME = "powerwatch";
const STORE = "pending-reports";

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function queueReport(report: ReportPayload) {
  const db = await getDB();
  await db.add(STORE, { ...report, queuedAt: new Date().toISOString() });
}

export async function flushPendingReports(apiUrl: string) {
  const db = await getDB();
  const all = await db.getAll(STORE);
  const sent: number[] = [];

  for (const item of all) {
    try {
      const res = await fetch(`${apiUrl}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) sent.push(item.id);
    } catch {
      // réseau encore coupé, on réessaie plus tard
    }
  }

  const tx = db.transaction(STORE, "readwrite");
  await Promise.all(sent.map((id) => tx.store.delete(id)));
  await tx.done;

  return sent.length;
}
