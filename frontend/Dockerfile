# ══════════════════════════════════════════════════════════════════
#  frontend/Dockerfile  — optimised with Next.js standalone output
#  Standalone mode bundles only what's needed → tiny runtime image,
#  no full node_modules copy needed in the final stage.
# ══════════════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies (cached until package.json changes)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --prefer-offline

# ── Stage 2: Build Next.js (cached until src/ changes)
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: Lean runtime using standalone output
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache wget && \
    addgroup -g 1001 -S nodejs && \
    adduser  -S nextjs -u 1001

# Standalone output includes only the necessary server files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets must be copied separately
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# standalone output produces server.js directly — no `next start` needed
CMD ["node", "server.js"]
