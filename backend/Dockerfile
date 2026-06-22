# Dockerfile for Payload CMS + Next.js
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy dependency manifests, including pnpm's build-script allowlist and hoisting config.
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml .npmrc* ./
COPY patches* ./patches/
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Payload needs a secret while Next collects route data during build.
# Runtime containers still receive the real secret from docker compose.
RUN PAYLOAD_SECRET=build-time-placeholder-secret PAYLOAD_DB_PUSH=true pnpm build
RUN pnpm prune --prod

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_PUBLIC_SERVER_URL=https://your-domain.com

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Next standalone tracing can miss sharp's optional libvips package on Alpine.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm/@img+sharp-libvips-* ./node_modules/.pnpm/
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/payload.config.ts ./payload.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/collections ./collections
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["sh", "-c", "export LD_LIBRARY_PATH=$(find /app/node_modules -name 'libvips-*.so*' -exec dirname {} \\; | head -n 1) && node server.js"]

