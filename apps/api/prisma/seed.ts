/**
 * Seed PowerWatch Cameroun
 * Lance : npx tsx prisma/seed.ts
 *
 * Données réelles : quartiers de Douala et Yaoundé
 * Coordonnées centroides approximatifs (WGS84)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Villes ────────────────────────────────────────────────────────────────
const CITIES = [
  { name: "Douala",    slug: "douala",    lat: 4.0511,  lng: 9.7679 },
  { name: "Yaoundé",   slug: "yaounde",   lat: 3.8480,  lng: 11.5021 },
  { name: "Bafoussam", slug: "bafoussam", lat: 5.4777,  lng: 10.4192 },
];

// ─── Quartiers Douala ───────────────────────────────────────────────────────
const DOUALA_ZONES = [
  { name: "Akwa",             slug: "akwa",             lat: 4.0561,  lng: 9.7054 },
  { name: "Bonanjo",          slug: "bonanjo",          lat: 4.0451,  lng: 9.6989 },
  { name: "Bonamoussadi",     slug: "bonamoussadi",     lat: 4.0783,  lng: 9.7411 },
  { name: "Makepe",           slug: "makepe",           lat: 4.0850,  lng: 9.7550 },
  { name: "Bonabéri",         slug: "bonaberi",         lat: 4.0700,  lng: 9.6700 },
  { name: "Deido",            slug: "deido",            lat: 4.0650,  lng: 9.7200 },
  { name: "Ndokotti",         slug: "ndokotti",         lat: 4.0530,  lng: 9.7350 },
  { name: "New Bell",         slug: "new-bell",         lat: 4.0540,  lng: 9.7300 },
  { name: "Bépanda",          slug: "bepanda",          lat: 4.0600,  lng: 9.7500 },
  { name: "Logpom",           slug: "logpom",           lat: 4.1000,  lng: 9.7300 },
  { name: "Kotto",            slug: "kotto",            lat: 4.0950,  lng: 9.7800 },
  { name: "PK 14",            slug: "pk14",             lat: 4.1100,  lng: 9.7600 },
  { name: "Cité des Palmiers",slug: "cite-des-palmiers",lat: 4.0900,  lng: 9.7250 },
  { name: "Ngodi Bakoko",     slug: "ngodi-bakoko",     lat: 4.0800,  lng: 9.6900 },
  { name: "Bonapriso",        slug: "bonapriso",        lat: 4.0500,  lng: 9.7150 },
  { name: "Bali",             slug: "bali",             lat: 4.0480,  lng: 9.7100 },
  { name: "Ndog Bong",        slug: "ndog-bong",        lat: 4.0430,  lng: 9.7500 },
  { name: "Mboppi",           slug: "mboppi",           lat: 4.0700,  lng: 9.7300 },
  { name: "Village",          slug: "village",          lat: 4.0620,  lng: 9.7050 },
  { name: "Cité Sic",         slug: "cite-sic",         lat: 4.0580,  lng: 9.7400 },
];

// ─── Quartiers Yaoundé ──────────────────────────────────────────────────────
const YAOUNDE_ZONES = [
  { name: "Biyem-Assi",       slug: "biyem-assi",       lat: 3.8350,  lng: 11.4900 },
  { name: "Melen",            slug: "melen",            lat: 3.8500,  lng: 11.5100 },
  { name: "Ngousso",          slug: "ngousso",          lat: 3.8700,  lng: 11.5200 },
  { name: "Omnisports",       slug: "omnisports",       lat: 3.8600,  lng: 11.5000 },
  { name: "Essos",            slug: "essos",            lat: 3.8800,  lng: 11.5300 },
  { name: "Messa",            slug: "messa",            lat: 3.8900,  lng: 11.5000 },
  { name: "Ekounou",          slug: "ekounou",          lat: 3.8200,  lng: 11.5400 },
  { name: "Nkol Eton",        slug: "nkol-eton",        lat: 3.8150,  lng: 11.5100 },
  { name: "Obili",            slug: "obili",            lat: 3.8650,  lng: 11.5050 },
  { name: "Nlongkak",         slug: "nlongkak",         lat: 3.8750,  lng: 11.5150 },
  { name: "Bastos",           slug: "bastos",           lat: 3.8700,  lng: 11.4950 },
  { name: "Centre Ville",     slug: "centre-ville",     lat: 3.8667,  lng: 11.5167 },
  { name: "Tsinga",           slug: "tsinga",           lat: 3.8800,  lng: 11.4900 },
  { name: "Mfandena",         slug: "mfandena",         lat: 3.8400,  lng: 11.5200 },
  { name: "Emana",            slug: "emana",            lat: 3.9200,  lng: 11.5300 },
  { name: "Nkolbisson",       slug: "nkolbisson",       lat: 3.8600,  lng: 11.4600 },
  { name: "Etoa Meki",        slug: "etoa-meki",        lat: 3.8300,  lng: 11.5050 },
  { name: "Mvog Ada",         slug: "mvog-ada",         lat: 3.8550,  lng: 11.5300 },
];

// ─── Quartiers Bafoussam ────────────────────────────────────────────────────
const BAFOUSSAM_ZONES = [
  { name: "Banengo",    slug: "banengo",    lat: 5.4900,  lng: 10.4150 },
  { name: "Tamdja",    slug: "tamdja",     lat: 5.4700,  lng: 10.4100 },
  { name: "Djeleng",   slug: "djeleng",    lat: 5.4850,  lng: 10.4300 },
  { name: "Tougang",   slug: "tougang",    lat: 5.4650,  lng: 10.4250 },
  { name: "Nguelemendouka", slug: "nguelemendouka", lat: 5.4750, lng: 10.4050 },
];

// ─── Lieux de charge initiaux ────────────────────────────────────────────────
const CHARGING_SPOTS = [
  { name: "Total Bonanjo",        type: "station",    lat: 4.0440, lng: 9.6980, address: "Rue Joffre, Bonanjo, Douala" },
  { name: "Total Deido",          type: "station",    lat: 4.0660, lng: 9.7220, address: "Avenue de France, Deido, Douala" },
  { name: "Total Makepe",         type: "station",    lat: 4.0860, lng: 9.7560, address: "Route de Makepe, Douala" },
  { name: "Cyber Café Akwa",      type: "cafe",       lat: 4.0560, lng: 9.7060, address: "Bd de la Liberté, Akwa, Douala" },
  { name: "Café de la Paix",      type: "cafe",       lat: 4.0530, lng: 9.7040, address: "Rue Joffre, Akwa, Douala" },
  { name: "Marché Central",       type: "other",      lat: 4.0520, lng: 9.7000, address: "Centre-ville, Douala" },
  { name: "Akwa Palace",          type: "hotel",      lat: 4.0580, lng: 9.7080, address: "Bd de la Liberté, Akwa, Douala" },
  { name: "Total Biyem-Assi",     type: "station",    lat: 3.8340, lng: 11.4910, address: "Carrefour Biyem-Assi, Yaoundé" },
  { name: "Total Melen",          type: "station",    lat: 3.8520, lng: 11.5120, address: "Route de Melen, Yaoundé" },
  { name: "Novotel Yaoundé",      type: "hotel",      lat: 3.8720, lng: 11.5150, address: "Bd du 20 Mai, Yaoundé" },
  { name: "Hilton Yaoundé",       type: "restaurant", lat: 3.8680, lng: 11.5170, address: "Bd du 20 Mai, Yaoundé" },
  { name: "Centre-ville Yaoundé", type: "other",      lat: 3.8667, lng: 11.5167, address: "Avenue Kennedy, Yaoundé" },
  { name: "Mall Bonanjo",         type: "cafe",       lat: 4.0430, lng: 9.6970, address: "Bonanjo, Douala" },
  { name: "Université de Douala", type: "other",      lat: 4.0600, lng: 9.7400, address: "Bépanda, Douala" },
];

async function main() {
  console.log("🌱 Démarrage du seed PowerWatch Cameroun…");

  // ── Villes ────────────────────────────────────────────────────────────────
  const cityMap: Record<string, string> = {};
  for (const city of CITIES) {
    const c = await prisma.city.upsert({
      where: { slug: city.slug },
      update: {},
      create: city,
    });
    cityMap[city.slug] = c.id;
    console.log(`  ✅ Ville : ${city.name} (${c.id})`);
  }

  // ── Zones Douala ──────────────────────────────────────────────────────────
  for (const zone of DOUALA_ZONES) {
    await prisma.zone.upsert({
      where: { cityId_slug: { cityId: cityMap["douala"], slug: zone.slug } },
      update: {},
      create: {
        name: zone.name,
        slug: zone.slug,
        cityId: cityMap["douala"],
        centroidLat: zone.lat,
        centroidLng: zone.lng,
        // Polygone carré ~500m autour du centroïde (approximatif)
        polygon: makeSquarePolygon(zone.lat, zone.lng, 0.005),
      },
    });
  }
  console.log(`  ✅ ${DOUALA_ZONES.length} quartiers Douala`);

  // ── Zones Yaoundé ─────────────────────────────────────────────────────────
  for (const zone of YAOUNDE_ZONES) {
    await prisma.zone.upsert({
      where: { cityId_slug: { cityId: cityMap["yaounde"], slug: zone.slug } },
      update: {},
      create: {
        name: zone.name,
        slug: zone.slug,
        cityId: cityMap["yaounde"],
        centroidLat: zone.lat,
        centroidLng: zone.lng,
        polygon: makeSquarePolygon(zone.lat, zone.lng, 0.005),
      },
    });
  }
  console.log(`  ✅ ${YAOUNDE_ZONES.length} quartiers Yaoundé`);

  // ── Zones Bafoussam ───────────────────────────────────────────────────────
  for (const zone of BAFOUSSAM_ZONES) {
    await prisma.zone.upsert({
      where: { cityId_slug: { cityId: cityMap["bafoussam"], slug: zone.slug } },
      update: {},
      create: {
        name: zone.name,
        slug: zone.slug,
        cityId: cityMap["bafoussam"],
        centroidLat: zone.lat,
        centroidLng: zone.lng,
        polygon: makeSquarePolygon(zone.lat, zone.lng, 0.004),
      },
    });
  }
  console.log(`  ✅ ${BAFOUSSAM_ZONES.length} quartiers Bafoussam`);

  // ── Lieux de charge ───────────────────────────────────────────────────────
  for (const spot of CHARGING_SPOTS) {
    await prisma.chargingSpot.upsert({
      where: { id: spot.name }, // upsert par nom (approximatif pour le seed)
      update: {},
      create: { ...spot, verified: true, upvotes: 0 },
    }).catch(() => prisma.chargingSpot.create({ data: { ...spot, verified: true } }));
  }
  console.log(`  ✅ ${CHARGING_SPOTS.length} lieux de charge`);

  // ── Admin par défaut ──────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("PowerWatch2025!", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@powerwatch.cm" },
    update: {},
    create: {
      email: "admin@powerwatch.cm",
      passwordHash,
      role: "superadmin",
    },
  });
  console.log("  ✅ Admin : admin@powerwatch.cm / PowerWatch2025!");

  console.log("\n🎉 Seed terminé avec succès !");
  console.log(`   ${DOUALA_ZONES.length + YAOUNDE_ZONES.length + BAFOUSSAM_ZONES.length} zones créées dans 3 villes`);
  console.log("   ⚠️  Changez le mot de passe admin en production !");
}

/**
 * Génère un polygone carré GeoJSON autour d'un centroïde.
 * delta ≈ 0.005° ≈ 500m
 */
function makeSquarePolygon(lat: number, lng: number, delta: number) {
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

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
