# =============================================
# Stage 1: Build
# =============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# =============================================
# Stage 2: Serve with Nginx
# =============================================
FROM nginx:alpine AS runner

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx config with SPA-friendly one
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
