import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud / local agents often open the app via 127.0.0.1 while Next binds on localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ayilaa.s3.eu-west-1.amazonaws.com" },
      { protocol: "https", hostname: "zgbccqtnguzbmaptahkf.supabase.co" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.onrender.com" },
      { protocol: "https", hostname: "minac.gov.cm" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "thumb.wikimedia.org" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "**.wikipedia.org" },
      { protocol: "https", hostname: "www.africine.org" },
      { protocol: "https", hostname: "www.cinaf.tv" },
      { protocol: "https", hostname: "cinaf.tv" },
      { protocol: "https", hostname: "**.mm.bing.net" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
