/** @type {import('next').NextConfig} */

// When building for GitHub Pages we produce a fully static export and run in
// "demo" mode (no backend). Both are toggled by env vars set in the CI
// workflow, so local `next dev` against the real API is unaffected.
const isStaticExport = process.env.NEXT_EXPORT === 'true';

// GitHub Pages serves project sites under /<repo>, injected by the
// actions/configure-pages step as NEXT_PUBLIC_BASE_PATH (e.g. "/Scanbolt").
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        output: 'export', // emit static HTML/JS into ./out
        images: { unoptimized: true },
        trailingSlash: true, // ensures /garage/ resolves to garage/index.html on Pages
      }
    : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  env: {
    // Base URL of the Scanbolt API (used only when NOT in demo mode).
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    // Demo mode short-circuits all network calls with in-memory mock data.
    NEXT_PUBLIC_DEMO: process.env.NEXT_PUBLIC_DEMO ?? 'false',
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
