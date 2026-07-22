import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // resvg-js ships a platform-specific native binary (like sharp) that
  // bundlers shouldn't try to inline — it needs to be resolved via normal
  // node require() at runtime on whatever platform is actually running.
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
