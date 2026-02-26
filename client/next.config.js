/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, 'mapbox-gl': 'mapbox-gl' };
    return config;
  },
  turbopack: {},
};

module.exports = nextConfig;

