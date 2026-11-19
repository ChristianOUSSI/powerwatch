import { create } from "zustand";
import type { ZonePublic, ZoneSnapshotPublic } from "@powerwatch/shared";

interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

interface ZonesState {
  zones: ZonePublic[];
  selectedZoneId: string | null;
  isOffline: boolean;
  lastSyncAt: string | null;
  reportRequested: boolean;
  userLocation: UserLocation | null;
  setZones: (zones: ZonePublic[]) => void;
  updateZoneSnapshot: (zoneId: string, snapshot: ZoneSnapshotPublic) => void;
  selectZone: (id: string | null) => void;
  setOffline: (v: boolean) => void;
  requestReport: () => void;
  clearReportRequest: () => void;
  setUserLocation: (loc: UserLocation | null) => void;
}

export const useZonesStore = create<ZonesState>((set) => ({
  zones: [],
  selectedZoneId: null,
  // Toujours false au premier rendu (SSR + client identiques) :
  // ServiceWorkerRegistrar pose la vraie valeur via setOffline() au montage.
  // Sinon mismatch d'hydratation React quand onLine=false.
  isOffline: false,
  lastSyncAt: null,
  reportRequested: false,
  userLocation: null,
  setZones: (zones) => set({ zones, lastSyncAt: new Date().toISOString() }),
  updateZoneSnapshot: (zoneId, snapshot) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === zoneId ? { ...z, snapshot } : z
      ),
      lastSyncAt: new Date().toISOString(),
    })),
  selectZone: (id) => set({ selectedZoneId: id }),
  setOffline: (v) => set({ isOffline: v }),
  requestReport: () => set({ reportRequested: true }),
  clearReportRequest: () => set({ reportRequested: false }),
  setUserLocation: (loc) => set({ userLocation: loc }),
}));
