import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Portraits live in Supabase Storage (the main project and preview branches).
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
