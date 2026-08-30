/** @type {import('next').NextConfig} */
const nextConfig = {
  // Electron bundles this as a self-contained server.js (see electron/main.ts)
  // rather than requiring a full node_modules install inside the exe.
  output: "standalone",
  experimental: {
    // Prisma's native query engine binary lives under our custom generator
    // `output` paths (node_modules/.prisma/online-client, offline-client)
    // instead of the default location Next's file tracing knows to follow —
    // without this, the binary gets left out of the traced/serverless
    // bundle and every DB call fails at runtime with
    // "could not locate the Query Engine". See https://pris.ly/d/engine-not-found-nextjs
    outputFileTracingIncludes: {
      "/*": [
        "./node_modules/.prisma/online-client/**/*",
        "./node_modules/.prisma/offline-client/**/*",
      ],
    },
  },
};
module.exports = nextConfig;
