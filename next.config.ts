import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  allowedDevOrigins: [
    "*.replit.dev",
    "*.janeway.replit.dev",
    "*.repl.co",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
