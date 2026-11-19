/**
 * Seed PowerWatch Cameroun
 * Lance : npx tsx prisma/seed.ts
 *
 * Crée les villes, les lieux de charge et l'admin par défaut.
 * Pas de zones prédéfinies : le signalement se fait librement sur la carte.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Villes principales du Cameroun ───────────────────────────────────────────
const CITIES = [
  { name: "Douala",      slug: "douala",      lat: 4.0511,  lng: 9.7679 },
  { name: "Yaoundé",     slug: "yaounde",     lat: 3.8480,  lng: 11.5021 },
  { name: "Bafoussam",   slug: "bafoussam",   lat: 5.4777,  lng: 10.4192 },
  { name: "Garoua",      slug: "garoua",      lat: 9.3017,  lng: 13.3944 },
  { name: "Maroua",      slug: "maroua",      lat: 10.5911, lng: 14.3159 },
  { name: "Bamenda",    slug: "bamenda",     lat: 5.9631,  lng: 10.1595 },
  { name: "Kumba",      slug: "kumba",       lat: 4.6375,  lng: 9.4400 },
  { name: "Nkongsamba", slug: "nkongsamba",  lat: 4.9583,  lng: 9.9406 },
  { name: "Buea",       slug: "buea",        lat: 4.1525,  lng: 9.2333 },
  { name: "Limbé",      slug: "limbe",       lat: 4.0167,  lng: 9.2167 },
  { name: "Ebolowa",    slug: "ebolowa",     lat: 2.9167,  lng: 11.1500 },
  { name: "Kribi",      slug: "kribi",       lat: 2.9400,  lng: 9.9100 },
  { name: "Bertoua",    slug: "bertoua",     lat: 4.5769,  lng: 13.6828 },
  { name: "Sangmélima", slug: "sangmelima",  lat: 3.0042,  lng: 11.6903 },
  { name: "Dschang",    slug: "dschang",     lat: 5.4500,  lng: 10.0667 },
];

// ─── Lieux de charge initiaux ────────────────────────────────────────────────
// Coordonnées précisées (vérifiables via Google Maps depuis la fiche)
const CHARGING_SPOTS = [
  { name: "Total Bonanjo",        type: "station",    lat: 4.0439, lng: 9.6972, address: "Bd de la Liberté, Bonanjo, Douala" },
  { name: "Total Deido",          type: "station",    lat: 4.0700, lng: 9.7140, address: "Avenue de France, Deido, Douala" },
  { name: "Total Makepe",         type: "station",    lat: 4.0833, lng: 9.7530, address: "Route de Makepe, Douala" },
  { name: "Cyber Café Akwa",      type: "cafe",       lat: 4.0519, lng: 9.7006, address: "Bd de la Liberté, Akwa, Douala" },
  { name: "Café de la Paix",      type: "cafe",       lat: 4.0528, lng: 9.7022, address: "Rue Joffre, Akwa, Douala" },
  { name: "Marché Central",       type: "other",      lat: 4.0517, lng: 9.7003, address: "Centre-ville, Douala" },
  { name: "Akwa Palace",          type: "hotel",      lat: 4.0547, lng: 9.7056, address: "Bd de la Liberté, Akwa, Douala" },
  { name: "Mall Bonanjo",         type: "cafe",       lat: 4.0472, lng: 9.7000, address: "Bonanjo, Douala" },
  { name: "Université de Douala", type: "other",      lat: 5.0500, lng: 10.4000, address: "Campus de Bangangté" },
  { name: "Total Biyem-Assi",     type: "station",    lat: 3.8460, lng: 11.4990, address: "Carrefour Biyem-Assi, Yaoundé" },
  { name: "Total Melen",          type: "station",    lat: 3.8519, lng: 11.5125, address: "Route de Melen, Yaoundé" },
  { name: "Novotel Yaoundé",      type: "hotel",      lat: 3.8764, lng: 11.5028, address: "Bd du 20 Mai, Yaoundé" },
  { name: "Hilton Yaoundé",       type: "restaurant", lat: 3.8728, lng: 11.5156, address: "Bd du 20 Mai, Yaoundé" },
  { name: "Centre-ville Yaoundé", type: "other",      lat: 3.8667, lng: 11.5167, address: "Avenue Kennedy, Yaoundé" },
];

async function main() {
  console.log("🌱 Démarrage du seed PowerWatch Cameroun…");

  // ── Villes ────────────────────────────────────────────────────────────────
  for (const city of CITIES) {
    const c = await prisma.city.upsert({
      where: { slug: city.slug },
      update: {},
      create: city,
    });
    console.log(`  ✅ Ville : ${city.name} (${c.id})`);
  }

  // Zones supprimées : le signalement est maintenant libre (sans zone prédéfinie)
  console.log("  ℹ️  Zones non créées (signalement libre activé)");

  // ── Lieux de charge ───────────────────────────────────────────────────────
  // 1) Suppression des doublons existants : même nom normalisé, on garde le plus ancien
  const allSpots = await prisma.chargingSpot.findMany({ orderBy: { createdAt: "asc" } });
  const seenNames = new Map<string, string>();
  const dupIds: string[] = [];
  for (const s of allSpots) {
    const key = s.name.trim().toLowerCase();
    if (seenNames.has(key)) dupIds.push(s.id);
    else seenNames.set(key, s.id);
  }
  if (dupIds.length > 0) {
    await prisma.chargingSpot.deleteMany({ where: { id: { in: dupIds } } });
    console.log(`  🧹 ${dupIds.length} lieu(x) de charge en double supprimé(s)`);
  }

  // 2) Upsert par nom : met à jour les coordonnées/adresses si elles changent
  for (const spot of CHARGING_SPOTS) {
    const existing = await prisma.chargingSpot.findFirst({
      where: { name: { equals: spot.name, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
    });
    if (existing) {
      await prisma.chargingSpot.update({
        where: { id: existing.id },
        data: { lat: spot.lat, lng: spot.lng, address: spot.address, type: spot.type },
      });
    } else {
      await prisma.chargingSpot.create({
        data: { ...spot, verified: true, upvotes: 0 },
      });
    }
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
  console.log(`   ${CITIES.length} villes créées`);
  console.log(`   ${CHARGING_SPOTS.length} lieux de charge`);
  console.log("   ⚠️  Changez le mot de passe admin en production !");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
