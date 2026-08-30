/** @type {import('next').NextConfig} */
const nextConfig = {
  // Electron bundles this as a self-contained server.js (see electron/main.ts)
  // rather than requiring a full node_modules install inside the exe.
  output: "standalone",
};
module.exports = nextConfig;
