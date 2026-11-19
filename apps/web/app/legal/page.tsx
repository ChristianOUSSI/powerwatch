import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Mentions légales : PowerWatch Cameroun",
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">
          ← Retour
        </Link>
        <h1 className="font-bold text-orange-400 text-sm">Mentions légales</h1>
      </div>

      <div className="p-4 max-w-xl mx-auto space-y-6 text-sm leading-relaxed pb-8">

        {/* Comment ça marche */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <h2 className="font-bold text-zinc-200">Comment ça marche</h2>
          <ul className="text-zinc-400 space-y-1.5">
            <li>1. La carte couleur montre l'état du courant par quartier : vert = stable, orange = instable, rouge = coupure.</li>
            <li>2. Touche un quartier sur la carte (ou le bouton Signaler en bas) pour dire si le courant est coupé, faible ou rétabli.</li>
            <li>3. Plus de monde signale, plus l'info est fiable. Ton quartier se met à jour en temps réel.</li>
            <li>4. L'onglet Charger liste les endroits où brancher ton téléphone pendant une coupure.</li>
          </ul>
        </section>

        {/* Présentation */}
        <section className="space-y-2">
          <h2 className="font-bold text-zinc-200">PowerWatch Cameroun</h2>
          <p className="text-zinc-400">
            Application web progressive (PWA) de suivi citoyen des coupures d'électricité
            au Cameroun. Projet indépendant, non affilié à ENEO, AES, SOCADEL ou tout autre
            opérateur du réseau électrique.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <Image
              src="/icons/cadc-img.jpeg"
              alt="CADC"
              width={44}
              height={44}
              className="rounded-lg object-cover"
            />
            <p className="text-zinc-500 text-xs">
              Conçu et développé par <span className="text-orange-400 font-semibold">CADC</span>
            </p>
          </div>
        </section>

        {/* Données personnelles */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <h2 className="font-bold text-zinc-200">Données personnelles</h2>
          <ul className="text-zinc-400 space-y-1.5">
            <li>• Aucun compte, email ou numéro de téléphone requis.</li>
            <li>• Un identifiant anonyme (UUID) est généré localement sur votre appareil et n'est jamais associé à votre identité réelle.</li>
            <li>• Vos coordonnées GPS, si partagées, sont arrondies à ~200 mètres avant stockage.</li>
            <li>• Aucune donnée n'est vendue à des tiers.</li>
            <li>• Les signalements sont supprimés ou expirés automatiquement après 6 heures maximum.</li>
          </ul>
        </section>

        {/* Responsabilité */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <h2 className="font-bold text-zinc-200">Responsabilité</h2>
          <p className="text-zinc-400">
            Les informations affichées proviennent de signalements citoyens et ne constituent
            pas une information officielle. PowerWatch ne garantit pas l'exactitude ni
            l'exhaustivité des données. L'application est fournie "telle quelle",
            sans garantie de disponibilité.
          </p>
        </section>

        {/* Modération */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <h2 className="font-bold text-zinc-200">Modération</h2>
          <p className="text-zinc-400">
            Des mécanismes automatiques (limite de fréquence, score de fiabilité) et une
            modération humaine permettent de détecter et supprimer les signalements abusifs.
            Tout abus répété entraîne une suspension temporaire de la capacité à signaler.
          </p>
        </section>

        {/* Open source */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <h2 className="font-bold text-zinc-200">Licence</h2>
          <p className="text-zinc-400">
            Code source disponible sous licence MIT. Les données géographiques des quartiers
            sont issues d'OpenStreetMap (© contributeurs OSM, licence ODbL).
          </p>
        </section>

        {/* Contact */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <h2 className="font-bold text-zinc-200">Contact</h2>
          <p className="text-zinc-400">
            Pour toute question ou signalement d'abus :{" "}
            <span className="text-orange-400">admin@powerwatch.cm</span>
          </p>
        </section>

        <p className="text-zinc-600 text-xs text-center">
          Dernière mise à jour : novembre 2026
        </p>
      </div>
    </div>
  );
}
