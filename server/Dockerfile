# ---------- build stage ----------
FROM node:lts-alpine AS build
WORKDIR /app

# install deps
COPY package.json package-lock.json* ./
RUN npm ci

# copy source
COPY . .

# build TS -> dist
RUN npm run build

# prune dev deps for runtime
RUN npm prune --omit=dev


# ---------- runtime stage ----------
FROM node:lts-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# only what we need at runtime
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# server listens on this (adjust if you use another)
EXPOSE 5000

CMD ["node", "dist/index.js"]
