/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@cura/fhir-models",
    "@cura/config",
    "@cura/auth",
    "@cura/db-client"
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias
    };
    return config;
  }
};

module.exports = nextConfig;