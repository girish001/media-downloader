# BUILD_ID: 20260315111014
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev --prefer-offline && npx prisma generate

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm install --prefer-offline
COPY src ./src/
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl wget unzip ca-certificates python3 py3-pip ffmpeg

RUN pip3 install --upgrade --break-system-packages yt-dlp && yt-dlp --version

# Pin to specific Deno version - busybox wget cannot follow GitHub /latest/ redirects
RUN wget https://github.com/denoland/deno/releases/download/v2.3.0/deno-x86_64-unknown-linux-musl.zip \
         -O /tmp/deno.zip && \
    unzip /tmp/deno.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/deno && \
    rm /tmp/deno.zip && \
    deno --version

RUN addgroup -g 1001 -S nodejs && adduser -S fastify -u 1001

COPY --from=deps    --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/dist         ./dist
COPY --from=builder --chown=fastify:nodejs /app/prisma       ./prisma
COPY --from=builder --chown=fastify:nodejs /app/package.json ./package.json
COPY --chown=fastify:nodejs docker-entrypoint.sh             ./docker-entrypoint.sh

USER fastify
EXPOSE 4000
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
