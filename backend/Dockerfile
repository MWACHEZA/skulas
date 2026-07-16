# =============================================
# Stage 1: Build
# =============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files and install ALL deps (including dev for tsc)
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema and generate client first
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# =============================================
# Stage 2: Production image
# =============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files and install ONLY production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# The compiled dist/src/lib/prisma.js requires '../generated/client'
# which resolves to dist/src/generated/client at runtime
COPY --from=builder /app/src/generated ./dist/src/generated

# Copy compiled JS
COPY --from=builder /app/dist ./dist

# Copy prisma schema (needed for migrations at runtime if desired)
COPY prisma ./prisma

# Storage directory for uploads
RUN mkdir -p ./storage

EXPOSE 5000

CMD ["node", "dist/src/index.js"]
