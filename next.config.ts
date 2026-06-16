import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: 'standalone',
    images: {
        // Niveaux de qualité autorisés (requis par next/image en Next.js 16).
        qualities: [75, 100],
        // Autorise les images distantes en HTTPS (avatars, couvertures de projets/articles).
        // Pour plus de sécurité, remplacez `**` par les domaines précis que vous utilisez.
        remotePatterns: [{ protocol: "https", hostname: "**" }],
    },
  /* config options here */
};

export default nextConfig;
