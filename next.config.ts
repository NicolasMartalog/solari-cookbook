import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@solarisdk/sdk", "@solarisdk/browser", "@solarisdk/core"],
}

export default nextConfig
