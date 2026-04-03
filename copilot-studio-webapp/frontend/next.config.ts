import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export so the Python backend can serve the built files directly.
  // This eliminates the need for a separate Node.js server in production.
  output: "export",
};

export default nextConfig;
