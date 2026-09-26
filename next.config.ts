import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ayilaa.s3.eu-west-1.amazonaws.com" },
      { protocol: "https", hostname: "zgbccqtnguzbmaptahkf.supabase.co" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.onrender.com" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
