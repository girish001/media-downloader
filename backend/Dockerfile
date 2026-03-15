# BUILD_ID: 20260315111801

############################
# 1️⃣ Dependencies stage
############################
FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    python3-pip \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev --prefer-offline \
 && npx prisma generate


############################
# 2️⃣ Build stage
############################
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    python3-pip \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json tsconfig.json ./
COPY prisma ./prisma/

RUN npm install --prefer-offline

COPY src ./src/

RUN npx prisma generate \
 && npx tsc --project tsconfig.json --skipLibCheck


############################
# 3️⃣ Runtime stage
############################
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y \
    openssl \
    wget \
    curl \
    unzip \
    ca-certificates \
    python3 \
    python3-pip \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp \
 && yt-dlp --version

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh \
 && mv /root/.deno/bin/deno /usr/local/bin/deno \
 && chmod +x /usr/local/bin/deno \
 && deno --version


############################
# 4️⃣ Create API user
############################
RUN groupadd -g 1001 nodejs \
 && useradd -u 1001 -g nodejs -m fastify


############################
# 5️⃣ Copy built files
############################
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh


############################
# 6️⃣ Run API
############################
USER fastify

EXPOSE 4000

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
