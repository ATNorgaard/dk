import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The prototype was served as files; anyone holding one of those links
  // lands on the matching page. Anything else ending in .html goes home.
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/landing.html", destination: "/", permanent: true },
      { source: "/freelancere.html", destination: "/da/freelancere", permanent: true },
      { source: "/freelancers.html", destination: "/en/freelancere", permanent: true },
      { source: "/portal.html", destination: "/da/portal", permanent: true },
      { source: "/:name.html", destination: "/", permanent: true },
    ];
  },
  images: {
    // Portraits live in Supabase Storage (the main project and preview branches).
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
