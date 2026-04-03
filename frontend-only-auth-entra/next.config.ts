import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — no Node.js server needed. Deploy the `out/` folder
  // to Azure Static Web App, GitHub Pages, or any static host.
  output: "export",
};

export default nextConfig;
