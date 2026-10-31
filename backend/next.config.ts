import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow isolated HTTP tests to run alongside the local demo server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  agentRules: false,
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  outputFileTracingExcludes: {
    '*': ['./.tencent-sync/**/*', './.env', './.env.*'],
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
};

export default withPayload(nextConfig);
