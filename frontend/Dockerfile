# ── Stage 1: Build React app ──────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_GATEWAY must be a RELATIVE path (/api) so the browser
# calls nginx, which then proxies to api-gateway:4000 internally.
# Never use http://api-gateway:4000 here — browsers can't resolve Docker hostnames.
ARG VITE_API_GATEWAY=/api
ARG VITE_WS_TRACKING=/socket.io
ENV VITE_API_GATEWAY=$VITE_API_GATEWAY
ENV VITE_WS_TRACKING=$VITE_WS_TRACKING

RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
