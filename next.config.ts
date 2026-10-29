import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Identificador de esta versión (en Vercel, el commit): la TV lo compara con el del servidor para recargarse sola al haber una nueva
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
};

export default nextConfig;
