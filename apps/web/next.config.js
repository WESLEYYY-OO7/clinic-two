/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cura/fhir-models", "@cura/config"]
};

module.exports = nextConfig;