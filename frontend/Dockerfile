FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm ci

# 🔥 FIX: give permission to tsc
RUN chmod +x node_modules/.bin/tsc

# Copy source
COPY . .

# ENV variables
ARG VITE_API_GATEWAY=/api
ARG VITE_WS_TRACKING=/socket.io
ENV VITE_API_GATEWAY=$VITE_API_GATEWAY
ENV VITE_WS_TRACKING=$VITE_WS_TRACKING

# Build project
RUN npx tsc && npx vite build