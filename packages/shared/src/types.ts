// Shared types : utilisés par le frontend et le backend

export type ReportType = "OUTAGE" | "MICRO_OUTAGE" | "RESTORED";
export type ZoneStatus = "STABLE" | "UNSTABLE" | "OUTAGE" | "UNKNOWN";

export interface ZonePublic {
  id: string;
  name: string;
  slug: string;
  cityId: string;
  centroidLat: number;
  centroidLng: number;
  // Feature GeoJSON sérialisée ; typé unknown pour ne pas dépendre
  // de @types/geojson côté API (les consumers castent côté web/Leaflet)
  polygon?: unknown;
  snapshot: ZoneSnapshotPublic | null;
}

export interface ZoneSnapshotPublic {
  status: ZoneStatus;
  outageScore: number;       // 0-100
  activeReports: number;
  outageSince: string | null; // ISO date
  computedAt: string;
}

export interface ReportPayload {
  type: ReportType;
  zoneId?: string; // optionnel pour signalement libre
  lat?: number;
  lng?: number;
  deviceId: string;
}

export interface ReportPublic {
  id: string;
  type: ReportType;
  zoneId: string;
  createdAt: string;
}

export interface ChargingSpot {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  zoneId?: string;
  address?: string;
  photoUrl?: string;
  verified: boolean;
  upvotes: number;
}

// WebSocket events (Socket.io)
export interface ServerToClientEvents {
  "zone:update": (snapshot: { zoneId: string } & ZoneSnapshotPublic) => void;
  "alert:new": (alert: OfficialAlertPublic) => void;
}

export interface ClientToServerEvents {
  "zone:subscribe": (zoneId: string) => void;
  "zone:unsubscribe": (zoneId: string) => void;
  "city:subscribe": (cityId: string) => void;
  "city:unsubscribe": (cityId: string) => void;
}

export interface CityPublic {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
}

export interface OfficialAlertPublic {
  id: string;
  zoneId?: string;
  title: string;
  message: string;
  source: string;
  startsAt: string;
  endsAt?: string;
}
