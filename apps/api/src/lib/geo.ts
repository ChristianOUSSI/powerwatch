// Données administratives approximatives du Cameroun pour les statistiques.
// Les centroïdes sont ceux des chefferies-villes approximativement ;
// la classification reste indicative (pas de géocodage officiel).

export interface Region {
  name: string;
  polygon: [number, number][]; // [lat, lng]
}

// Polygones grossiers des 10 régions (ordonnés pour les zones côtières d'abord)
export const REGIONS: Region[] = [
  {
    name: "Littoral",
    polygon: [[4.45, 9.10], [4.50, 9.85], [4.15, 10.00], [3.85, 9.70], [3.80, 9.25]],
  },
  {
    name: "Sud-Ouest",
    polygon: [[4.10, 9.90], [3.70, 9.90], [2.70, 9.80], [2.55, 9.10], [2.90, 8.60], [3.90, 8.75]],
  },
  {
    name: "Ouest",
    polygon: [[5.70, 9.90], [5.65, 10.75], [4.95, 10.75], [4.80, 10.15], [5.00, 9.85]],
  },
  {
    name: "Nord-Ouest",
    polygon: [[6.70, 9.55], [6.65, 10.65], [5.60, 10.70], [5.60, 9.80]],
  },
  {
    name: "Extrême-Nord",
    polygon: [[13.10, 13.60], [13.05, 16.10], [9.20, 16.05], [9.25, 13.75]],
  },
  {
    name: "Nord",
    polygon: [[9.75, 13.20], [9.80, 15.50], [6.85, 15.45], [6.90, 13.30]],
  },
  {
    name: "Adamaoua",
    polygon: [[9.05, 11.30], [9.00, 14.70], [5.25, 14.65], [5.30, 11.40]],
  },
  {
    name: "Est",
    polygon: [[5.45, 12.55], [5.40, 16.30], [2.15, 16.25], [2.25, 12.65]],
  },
  {
    name: "Centre",
    polygon: [[5.40, 10.40], [5.35, 12.60], [3.30, 12.65], [3.35, 10.35]],
  },
  {
    name: "Sud",
    polygon: [[3.65, 10.25], [3.60, 13.05], [1.70, 13.00], [1.75, 10.35]],
  },
];

export interface Department {
  name: string;
  region: string;
  lat: number;
  lng: number;
}

// Chefferies des départements (coordonnées approximatives)
export const DEPARTMENTS: Department[] = [
  // Adamaoua
  { name: "Banyo", region: "Adamaoua", lat: 6.73, lng: 11.84 },
  { name: "Djerem", region: "Adamaoua", lat: 7.32, lng: 13.62 },
  { name: "Mayo-Banyo", region: "Adamaoua", lat: 7.47, lng: 11.52 },
  { name: "Mbéré", region: "Adamaoua", lat: 7.35, lng: 13.58 },
  { name: "Vina", region: "Adamaoua", lat: 7.32, lng: 13.58 },
  // Centre
  { name: "Mfoundi", region: "Centre", lat: 3.87, lng: 11.52 },
  { name: "Méfou-et-Akono", region: "Centre", lat: 3.52, lng: 11.52 },
  { name: "Méfou-et-Afamba", region: "Centre", lat: 4.30, lng: 11.28 },
  { name: "Nyong-et-Kellé", region: "Centre", lat: 3.60, lng: 10.50 },
  { name: "Nyong-et-Mfoumou", region: "Centre", lat: 4.62, lng: 11.30 },
  { name: "Nyong-et-So'o", region: "Centre", lat: 3.65, lng: 10.58 },
  { name: "Lékeny", region: "Centre", lat: 4.30, lng: 11.60 },
  // Est
  { name: "Boumba-et-Ngoko", region: "Est", lat: 3.20, lng: 14.80 },
  { name: "Haut-Nyong", region: "Est", lat: 3.60, lng: 13.30 },
  { name: "Haut-Uolo", region: "Est", lat: 4.60, lng: 14.60 },
  { name: "Kélé", region: "Est", lat: 3.50, lng: 15.10 },
  { name: "Lom-et-Djérem", region: "Est", lat: 4.30, lng: 13.70 },
  // Extrême-Nord
  { name: "Logone-et-Chari", region: "Extrême-Nord", lat: 10.60, lng: 14.30 },
  { name: "Mayo-Danay", region: "Extrême-Nord", lat: 10.20, lng: 14.80 },
  { name: "Mayo-Kani", region: "Extrême-Nord", lat: 10.65, lng: 14.05 },
  { name: "Mayo-Sava", region: "Extrême-Nord", lat: 10.45, lng: 14.55 },
  { name: "Diamaré", region: "Extrême-Nord", lat: 10.20, lng: 14.20 },
  // Littoral
  { name: "Wouri", region: "Littoral", lat: 4.05, lng: 9.70 },
  { name: "Nkam", region: "Littoral", lat: 4.45, lng: 9.75 },
  { name: "Sanaga-Maritime", region: "Littoral", lat: 3.80, lng: 10.13 },
  // Nord
  { name: "Bénoué", region: "Nord", lat: 9.30, lng: 13.60 },
  { name: "Faro", region: "Nord", lat: 8.40, lng: 13.65 },
  { name: "Mayo-Louti", region: "Nord", lat: 8.80, lng: 14.30 },
  { name: "Mayo-Rey", region: "Nord", lat: 9.00, lng: 14.60 },
  // Nord-Ouest
  { name: "Boyoo", region: "Nord-Ouest", lat: 6.20, lng: 10.60 },
  { name: "Bui", region: "Nord-Ouest", lat: 6.20, lng: 10.65 },
  { name: "Donga-Mantung", region: "Nord-Ouest", lat: 6.05, lng: 10.60 },
  { name: "Lebialem", region: "Nord-Ouest", lat: 6.10, lng: 10.35 },
  { name: "Mezam", region: "Nord-Ouest", lat: 5.97, lng: 10.15 },
  { name: "Menchum", region: "Nord-Ouest", lat: 6.42, lng: 10.07 },
  { name: "Momo", region: "Nord-Ouest", lat: 6.25, lng: 10.23 },
  // Ouest
  { name: "Bamboutos", region: "Ouest", lat: 5.47, lng: 10.42 },
  { name: "Bamyang", region: "Ouest", lat: 5.60, lng: 10.75 },
  { name: "Haut-Nkam", region: "Ouest", lat: 5.45, lng: 10.40 },
  { name: "Koung-Khi", region: "Ouest", lat: 5.30, lng: 10.60 },
  { name: "Menoua", region: "Ouest", lat: 5.45, lng: 10.07 },
  { name: "Mifi", region: "Ouest", lat: 5.47, lng: 10.10 },
  { name: "Noun", region: "Ouest", lat: 5.72, lng: 10.90 },
  { name: "Upper Nkam", region: "Ouest", lat: 5.48, lng: 10.45 },
  // Sud
  { name: "Dja-et-Lobo", region: "Sud", lat: 3.00, lng: 11.69 },
  { name: "Mvila", region: "Sud", lat: 2.55, lng: 11.05 },
  { name: "Océan", region: "Sud", lat: 2.80, lng: 10.20 },
  { name: "Valley", region: "Sud", lat: 2.60, lng: 10.60 },
  // Sud-Ouest
  { name: "Fako", region: "Sud-Ouest", lat: 4.15, lng: 9.17 },
  { name: "Manyu", region: "Sud-Ouest", lat: 5.63, lng: 9.30 },
  { name: "Meme", region: "Sud-Ouest", lat: 4.65, lng: 9.30 },
  { name: "Ndian", region: "Sud-Ouest", lat: 4.33, lng: 8.95 },
];

export interface Arrondissement {
  name: string;
  city: string;
  lat: number;
  lng: number;
}

// Arrondissements connus (centres approximatifs)
export const ARRONDISSEMENTS: Arrondissement[] = [
  // Yaoundé : 7 arrondissements
  { name: "Mfoundi", city: "Yaoundé", lat: 3.867, lng: 11.517 },
  { name: "Centre", city: "Yaoundé", lat: 3.862, lng: 11.510 },
  { name: "Tsinga", city: "Yaoundé", lat: 3.875, lng: 11.505 },
  { name: "Biyem-Assi", city: "Yaoundé", lat: 3.845, lng: 11.495 },
  { name: "Ahala", city: "Yaoundé", lat: 3.830, lng: 11.525 },
  { name: "Ekounou", city: "Yaoundé", lat: 3.790, lng: 11.490 },
  { name: "Nlongkak", city: "Yaoundé", lat: 3.900, lng: 11.510 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const R = 6371;

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersect =
      lngI > lng !== lngJ > lng && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function nearest<T extends { lat: number; lng: number }>(
  lat: number,
  lng: number,
  items: T[],
): T | null {
  if (items.length === 0) return null;
  let best = items[0];
  let bestD = distanceKm(lat, lng, best.lat, best.lng);
  for (const it of items.slice(1)) {
    const d = distanceKm(lat, lng, it.lat, it.lng);
    if (d < bestD) {
      bestD = d;
      best = it;
    }
  }
  return best;
}

export function regionFor(lat: number, lng: number): string {
  for (const r of REGIONS) {
    if (pointInPolygon(lat, lng, r.polygon)) return r.name;
  }
  // Repli : région la plus proche de son centroïde approximatif
  const centers: Record<string, [number, number]> = {
    Littoral: [4.05, 9.65],
    "Sud-Ouest": [3.60, 9.30],
    Ouest: [5.30, 10.30],
    "Nord-Ouest": [6.10, 10.20],
    Centre: [4.00, 11.80],
    Sud: [2.60, 11.60],
    Est: [3.60, 14.50],
    Adamaoua: [7.00, 13.00],
    Nord: [8.50, 14.30],
    "Extrême-Nord": [10.50, 14.50],
  };
  let best = "Centre";
  let bestD = Infinity;
  for (const [name, [clat, clng]] of Object.entries(centers)) {
    const d = distanceKm(lat, lng, clat, clng);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

// Direction cardinale par rapport à une ville
export function directionFrom(lat: number, lng: number, cityLat: number, cityLng: number): string {
  const dLat = lat - cityLat;
  const dLng = (lng - cityLng) * Math.cos((cityLat * Math.PI) / 180);
  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI; // 0 = nord
  const dirs = ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ouest", "Ouest", "Nord-Ouest"];
  return dirs[Math.round(((angle + 360) % 360) / 45) % 8];
}
