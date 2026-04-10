# ---------- BUILD STAGE ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --force

COPY . .

# ✅ fix permission issue
RUN chmod -R 755 /app/node_modules/.bin

# ✅ compile
RUN npx tsc

# ---------- PRODUCTION STAGE ----------
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN npm install --omit=dev

CMD ["node", "dist/index.js"]