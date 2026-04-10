# ── Stage 1: Build React app ───────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install dependencies (includes dev deps for build)
RUN npm ci

COPY . .

# Build-time env variables
ARG VITE_API_GATEWAY=/api
ARG VITE_WS_TRACKING=/socket.io

ENV VITE_API_GATEWAY=$VITE_API_GATEWAY
ENV VITE_WS_TRACKING=$VITE_WS_TRACKING

# ✅ Only build (no need for tsc separately)
RUN npm run build


# ── Stage 2: Serve with Nginx ──────────────────────
FROM nginx:1.27-alpine

# Copy build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ✅ only production deps here
RUN npm ci --omit=dev

# Render uses 10000
EXPOSE 10000

CMD ["nginx", "-g", "daemon off;"]