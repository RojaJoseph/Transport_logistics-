# ══════════════════════════════════════════════════════════════════
#  frontend — Production Dockerfile
#  Stage 1 : Vite build  →  Stage 2 : Nginx static server
# ══════════════════════════════════════════════════════════════════

# ── Stage 1 : Build ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source (node_modules excluded via .dockerignore)
COPY . .

# Pass the API gateway URL at build time
ARG VITE_API_GATEWAY=http://localhost:4000
ARG VITE_WS_TRACKING=http://localhost:4003
ENV VITE_API_GATEWAY=$VITE_API_GATEWAY
ENV VITE_WS_TRACKING=$VITE_WS_TRACKING

RUN npm run build

# ── Stage 2 : Serve with Nginx ────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx runs as root to bind port 80 — that's the standard Nginx container pattern
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
