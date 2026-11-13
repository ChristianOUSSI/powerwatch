/**
 * Importe les vrais contours de quartiers depuis OpenStreetMap (Overpass API).
 *
 * Usage : npx tsx scripts/import-osm-zones.ts
 *
 * - Met à jour le polygone et le centroïde des zones existantes (même slug)
 * - Crée les quartiers trouvés sur OSM absents de la base
 * - Les ways OSM taggées place=neighbourhood|suburb|quarter|district deviennent
 *   de vrais polygones ; les simples noeuds donnent un carré de ~500 m
 *
 * Nécessite : base de données accessible (DATABASE_URL) et villes déjà seedées.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OVERPASS = "https://overpass-api.de/api/interpreter";
const RADIUS_M = 40_000; // ~40 km autour du centre-ville

const CITIES = [
  { slug: "douala",    name: "Douala",    lat: 4.0511,  lng: 9.7679 },
  { slug: "yaounde",   name: "Yaoundé",   lat: 3.8480,  lng: 11.5021 },
  { slug: "bafoussam", name: "Bafoussam", lat: 5.4777,  lng: 10.4192 },
];

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function centroidOf(coords: [number, number][]): [number, number] {
  let lat = 0, lng = 0;
  for (const [x, y] of coords) { lng += x; lat += y; }
  return [lat / coords.length, lng / coords.length];
}

function squarePolygon(lat: number, lng: number, delta = 0.005) {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[
        [lng - delta, lat - delta],
        [lng + delta, lat - delta],
        [lng + delta, lat + delta],
        [lng - delta, lat + delta],
        [lng - delta, lat - delta],
      ]],
    },
  };
}

interface OsmMember {
  type: "node" | "way";
  ref: number;
  geometry?: { lat: number; lon: number }[];
  lat?: number;
  lon?: number;
}

interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: { name?: string };
  geometry?: { lat: number; lon: number }[];
  center?: { lat: number; lon: number };
  members?: OsmMember[];
}

async function fetchOsmZones(lat: number, lng: number): Promise<OsmElement[]> {
  const query = `
[out:json][timeout:90];
(
  way["place"~"^(neighbourhood|suburb|quarter|district)$"]["name"](around:${RADIUS_M},${lat},${lng});
  node["place"~"^(neighbourhood|suburb|quarter|district)$"]["name"](around:${RADIUS_M},${lat},${lng});
  relation["boundary"="administrative"]["name"](around:${RADIUS_M},${lat},${lng});
  relation["type"="boundary"]["place"~"^(neighbourhood|suburb|quarter|district)$"]["name"](around:${RADIUS_M},${lat},${lng});
);
out geom;`;

  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const json = await res.json();
  return json.elements as OsmElement[];
}

const closeEnough = (a: [number, number], b: [number, number]) =>
  Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

function ringArea(ring: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return a / 2;
}

/**
 * Assemble les ways membres d'une relation OSM en anneaux fermés.
 * Stratégie gloutonne : on colle les segments bout à bout par leurs extrémités.
 */
function stitchRings(segments: [number, number][][]): [number, number][][] {
  const pool = segments.filter((s) => s.length >= 2).map((s) => [...s]);
  const rings: [number, number][][] = [];

  while (pool.length > 0) {
    let ring = pool.pop()!;
    let extended = true;
    while (extended) {
      extended = false;
      const first = ring[0];
      const last = ring[ring.length - 1];
      for (let i = 0; i < pool.length; i++) {
        const s = pool[i];
        const sFirst = s[0];
        const sLast = s[s.length - 1];
        let merged: [number, number][] | null = null;
        if (closeEnough(sLast, first)) merged = [...s.slice(0, -1), ...ring];
        else if (closeEnough(sFirst, first)) merged = [...[...s].reverse().slice(0, -1), ...ring];
        else if (closeEnough(sFirst, last)) merged = [...ring, ...s.slice(1)];
        else if (closeEnough(sLast, last)) merged = [...ring, ...[...s].reverse().slice(1)];
        if (merged) {
          ring = merged;
          pool.splice(i, 1);
          extended = true;
          break;
        }
      }
    }
    rings.push(ring);
  }
  return rings;
}

function elementToZone(el: OsmElement):
  | { name: string; lat: number; lng: number; polygon: object }
  | null {
  const name = el.tags?.name?.trim();
  if (!name) return null;

  // Relation (multipolygone de limite) : on assemble les ways membres en anneaux
  if (el.type === "relation" && el.members) {
    const segments: [number, number][][] = [];
    for (const m of el.members) {
      if (m.type !== "way" || !m.geometry || m.geometry.length < 2) continue;
      segments.push(m.geometry.map((g) => [g.lon, g.lat] as [number, number]));
    }
    if (segments.length === 0) return null;

    const rings = stitchRings(segments)
      .map((r) => {
        if (r.length < 4) return null;
        const first = r[0];
        const last = r[r.length - 1];
        return closeEnough(first, last) ? r : [...r, first];
      })
      .filter((r): r is [number, number][] => r !== null && r.length >= 4)
      .sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)));

    const outer = rings[0];
    if (!outer) return null;

    // Seul le plus grand anneau est utilisé : les éventuels disjoints
    // (exclave territorial) sont rares à cette échelle et créeraient
    // un trou invalide s'ils étaient passés en inner ring.
    const [clat, clng] = el.center
      ? [el.center.lat, el.center.lon]
      : centroidOf(outer);

    return {
      name,
      lat: clat,
      lng: clng,
      polygon: {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [outer] },
      },
    };
  }

  // Way avec géométrie : on essaie de former un polygone fermé
  if (el.type === "way" && el.geometry && el.geometry.length >= 4) {
    const coords: [number, number][] = el.geometry.map((g) => [g.lon, g.lat]);
    const first = coords[0];
    const last = coords[coords.length - 1];
    const ring =
      first[0] === last[0] && first[1] === last[1] ? coords : [...coords, first];
    if (ring.length >= 4) {
      const [clat, clng] = centroidOf(ring);
      return {
        name,
        lat: clat,
        lng: clng,
        polygon: {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [ring] },
        },
      };
    }
  }

  // Noeud ou way sans contour exploitable : centroïde + carré de secours
  const clat = el.lat ?? el.center?.lat ?? el.geometry?.[0]?.lat;
  const clng = el.lon ?? el.center?.lon ?? el.geometry?.[0]?.lon;
  if (clat == null || clng == null) return null;
  return { name, lat: clat, lng: clng, polygon: squarePolygon(clat, clng) };
}

async function main() {
  console.log("Import des quartiers depuis OpenStreetMap…\n");

  for (const city of CITIES) {
    const dbCity = await prisma.city.findUnique({ where: { slug: city.slug } });
    if (!dbCity) {
      console.log(`  ⚠ Ville "${city.name}" absente, lance d'abord le seed`);
      continue;
    }

    let elements: OsmElement[];
    try {
      elements = await fetchOsmZones(city.lat, city.lng);
    } catch (err) {
      console.log(`  ✗ ${city.name} : ${(err as Error).message}`);
      continue;
    }

    let created = 0, updated = 0, skipped = 0;
    for (const el of elements) {
      const z = elementToZone(el);
      if (!z) { skipped++; continue; }

      const slug = slugify(z.name);
      if (!slug) { skipped++; continue; }

      const existing = await prisma.zone.findUnique({
        where: { cityId_slug: { cityId: dbCity.id, slug } },
      });

      if (existing) {
        await prisma.zone.update({
          where: { id: existing.id },
          data: { polygon: z.polygon as object, centroidLat: z.lat, centroidLng: z.lng, name: z.name },
        });
        updated++;
      } else {
        await prisma.zone.create({
          data: {
            name: z.name,
            slug,
            cityId: dbCity.id,
            centroidLat: z.lat,
            centroidLng: z.lng,
            polygon: z.polygon as object,
          },
        });
        created++;
      }
    }
    console.log(`  ${city.name} : ${updated} mises à jour, ${created} créées, ${skipped} ignorées`);
  }

  console.log("\nTerminé. Relance le seed si tu veux garder les anciens quartiers en plus.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
