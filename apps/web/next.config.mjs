/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA headers : le service worker est géré manuellement (léger, sans next-pwa)
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
  // Optimisation images désactivée (économie RAM serveur)
  images: { unoptimized: true },
  // Compression gzip activée
  compress: true,
};

export default nextConfig;
