import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  allowedDevOrigins: [
    "*.replit.dev",
    "*.janeway.replit.dev",
    "*.repl.co",
  ],
};

export default nextConfig;
