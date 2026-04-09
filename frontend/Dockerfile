# ── Stage 1: Build React app ───────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

# Install TypeScript globally (fix)
RUN npm install -g typescript

COPY . .

ARG VITE_API_GATEWAY=/api
ARG VITE_WS_TRACKING=/socket.io
ENV VITE_API_GATEWAY=$VITE_API_GATEWAY
ENV VITE_WS_TRACKING=$VITE_WS_TRACKING

RUN npx tsc && npx vite build


# ── Stage 2: Serve with Nginx ──────────────────────
FROM nginx:1.27-alpine

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Render requires this port
EXPOSE 10000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]