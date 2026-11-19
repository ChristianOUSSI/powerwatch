import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  ARRONDISSEMENTS,
  DEPARTMENTS,
  distanceKm,
  directionFrom,
  nearest,
  regionFor,
} from "../lib/geo.js";

export const statsRouter = Router();

const PERIODS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// Taille de cellule de clustering (~2 km) : un "quartier" = un cluster de signalements proches
const CELL = 0.02;

interface ZoneStat {
  key: string;
  label: string;
  lat: number;
  lng: number;
  reports: number;
  outages: number;
  instables: number;
  retablis: number;
  firstAt: string | null;
  lastAt: string | null;
  minDurationMin: number | null;
  maxDurationMin: number | null;
  ongoing: number; // épisodes de coupure encore en cours
}

interface Cluster {
  latSum: number;
  lngSum: number;
  count: number;
  outages: number;
  instables: number;
  retablis: number;
  firstAt: Date | null;
  lastAt: Date | null;
  durations: number[]; // minutes
  ongoing: number;
}

// Calcule les épisodes de coupure : un épisode commence sur OUTAGE/MICRO_OUTAGE
// et se termine au premier RESTORED. Un épisode non refermé = coupure en cours.
function outageDurations(reports: { type: string; createdAt: Date }[]): {
  durations: number[];
  ongoing: number;
} {
  const durations: number[] = [];
  let ongoing = 0;
  let episodeStart: Date | null = null;

  for (const r of reports) {
    if (r.type === "OUTAGE" || r.type === "MICRO_OUTAGE") {
      if (episodeStart === null) episodeStart = r.createdAt;
    } else if (r.type === "RESTORED" && episodeStart !== null) {
      durations.push((r.createdAt.getTime() - episodeStart.getTime()) / 60000);
      episodeStart = null;
    }
  }
  if (episodeStart !== null) ongoing++;
  return { durations, ongoing };
}

statsRouter.get("/", async (req, res) => {
  const period = (req.query.period as string) ?? "24h";
  const ms = PERIODS[period];
  if (!ms) return res.status(400).json({ error: "Période invalide (24h, 7d, 30d)" });

  try {
    const since = new Date(Date.now() - ms);

    // Tous les signalements avec coordonnées sur la période (hors signalements marqués spam)
    const reports = await prisma.report.findMany({
      where: {
        lat: { not: null },
        lng: { not: null },
        status: { not: "FLAGGED" },
        createdAt: { gte: since },
      },
      select: { type: true, lat: true, lng: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 10000,
    });

    // Villes pour l'étiquetage et le regroupement
    const cities = await prisma.city.findMany({ select: { name: true, slug: true, lat: true, lng: true } });

    // ── 1) Clustering spatial (~2 km) = niveau "quartier" ──────────────────
    const clusters = new Map<string, { lat: number; lng: number; reports: typeof reports }>();
    for (const r of reports) {
      if (r.lat == null || r.lng == null) continue;
      const key = `${Math.floor(r.lat / CELL)}|${Math.floor(r.lng / CELL)}`;
      const c = clusters.get(key) ?? { lat: 0, lng: 0, reports: [] };
      c.lat += r.lat;
      c.lng += r.lng;
      c.reports.push(r);
      clusters.set(key, c);
    }

    const zoneStats: ZoneStat[] = [];
    const zoneGeo: { stat: ZoneStat; cityDist: number }[] = [];

    for (const [, c] of clusters) {
      const lat = c.lat / c.reports.length;
      const lng = c.lng / c.reports.length;

      const { durations, ongoing } = outageDurations(c.reports);
      const firstAt = c.reports[0]?.createdAt ?? null;
      const lastAt = c.reports[c.reports.length - 1]?.createdAt ?? null;

      // Ville la plus proche + direction pour étiqueter le quartier
      const city = nearest(lat, lng, cities);
      const cityDist = city ? distanceKm(lat, lng, city.lat, city.lng) : Infinity;
      let label: string;
      if (city && cityDist < 12) {
        label = city.name;
      } else if (city && cityDist < 45) {
        label = `${directionFrom(lat, lng, city.lat, city.lng)} de ${city.name}`;
      } else {
        label = nearest(lat, lng, DEPARTMENTS)?.name ?? "Zone rurale";
      }

      const stat: ZoneStat = {
        key: `${lat.toFixed(4)}|${lng.toFixed(4)}`,
        label,
        lat,
        lng,
        reports: c.reports.length,
        outages: c.reports.filter((r) => r.type === "OUTAGE").length,
        instables: c.reports.filter((r) => r.type === "MICRO_OUTAGE").length,
        retablis: c.reports.filter((r) => r.type === "RESTORED").length,
        firstAt: firstAt?.toISOString() ?? null,
        lastAt: lastAt?.toISOString() ?? null,
        minDurationMin: durations.length ? Math.round(Math.min(...durations)) : null,
        maxDurationMin: durations.length ? Math.round(Math.max(...durations)) : null,
        ongoing,
      };
      zoneStats.push(stat);
      zoneGeo.push({ stat, cityDist });
    }

    // ── 2) Agrégation par niveau ────────────────────────────────────────────
    function aggregate(keyOf: (z: ZoneStat, idx: number) => string, labelOf?: (key: string) => string) {
      const map = new Map<string, ZoneStat & { _latSum: number; _lngSum: number }>();
      zoneGeo.forEach(({ stat }, i) => {
        const key = keyOf(stat, i);
        const agg = map.get(key) ?? {
          key,
          label: labelOf ? labelOf(key) : key,
          lat: 0,
          lng: 0,
          reports: 0,
          outages: 0,
          instables: 0,
          retablis: 0,
          firstAt: null,
          lastAt: null,
          minDurationMin: null,
          maxDurationMin: null,
          ongoing: 0,
          _latSum: 0,
          _lngSum: 0,
        };
        agg._latSum += stat.lat * stat.reports;
        agg._lngSum += stat.lng * stat.reports;
        agg.reports += stat.reports;
        agg.outages += stat.outages;
        agg.instables += stat.instables;
        agg.retablis += stat.retablis;
        agg.ongoing += stat.ongoing;
        if (stat.firstAt && (!agg.firstAt || stat.firstAt < agg.firstAt)) agg.firstAt = stat.firstAt;
        if (stat.lastAt && (!agg.lastAt || stat.lastAt > agg.lastAt)) agg.lastAt = stat.lastAt;
        if (stat.minDurationMin != null)
          agg.minDurationMin = agg.minDurationMin == null ? stat.minDurationMin : Math.min(agg.minDurationMin, stat.minDurationMin);
        if (stat.maxDurationMin != null)
          agg.maxDurationMin = agg.maxDurationMin == null ? stat.maxDurationMin : Math.max(agg.maxDurationMin, stat.maxDurationMin);
        map.set(key, agg);
      });
      return [...map.values()]
        .map(({ _latSum, _lngSum, ...s }) => ({
          ...s,
          lat: s.reports ? _latSum / s.reports : 0,
          lng: s.reports ? _lngSum / s.reports : 0,
        }))
        .sort((a, b) => b.outages - a.outages || b.reports - a.reports)
        .slice(0, 50);
    }

    // Villes : groupe les quartiers par ville la plus proche (<= 45 km)
    const villes = aggregate(
      (z, i) => {
        const city = nearest(z.lat, z.lng, cities);
        const d = city ? distanceKm(z.lat, z.lng, city.lat, city.lng) : Infinity;
        return d <= 45 ? city!.slug : "autres";
      },
      (key) => cities.find((c) => c.slug === key)?.name ?? "Autres zones",
    );

    // Départements : centroïde le plus proche
    const departements = aggregate(
      (z) => nearest(z.lat, z.lng, DEPARTMENTS)?.name ?? "Inconnu",
    );

    // Régions : polygone puis centroïde
    const regions = aggregate((z) => regionFor(z.lat, z.lng));

    // Arrondissements : uniquement là où des données existent (Yaoundé aujourd'hui)
    const arrondissements = aggregate((z) => {
      const a = nearest(z.lat, z.lng, ARRONDISSEMENTS);
      return a && distanceKm(z.lat, z.lng, a.lat, a.lng) <= 15 ? a.name : "Hors arrondissement";
    });

    // Tri des quartiers par nombre de coupures
    zoneStats.sort((a, b) => b.outages - a.outages || b.reports - a.reports);

    res.json({
      period,
      generatedAt: new Date().toISOString(),
      totalReports: reports.length,
      totalZones: zoneStats.length,
      zones: zoneStats.slice(0, 100),
      villes,
      departements,
      regions,
      arrondissements,
    });
  } catch (err) {
    console.error("[stats GET]", err);
    res.status(500).json({ error: "Erreur interne." });
  }
});
