import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@solarisdk/sdk",
    "@solarisdk/browser",
    "@solarisdk/core",
    "patchright-core",
    "patchright",
  ],
  outputFileTracingIncludes: {
    "/api/runs": [
      "./node_modules/patchright-core/**/*",
      "./node_modules/@solarisdk/**/*",
      "./demo/**/*",
    ],
  },
}

export default nextConfig
