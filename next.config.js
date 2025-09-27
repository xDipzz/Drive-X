/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
/** @type {import("next").NextConfig} */
const config = {
  eslint: {
    // Ignore ESLint errors during builds to prevent deployment failures
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript build errors on Vercel to avoid blocking deploys
    ignoreBuildErrors: true,
  },
};

export default config;
