# ---------- build stage ----------
FROM node:24-alpine AS build
WORKDIR /app

# Enable pnpm via corepack (uses "packageManager" from package.json)
RUN corepack enable

# Copy workspace manifests first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# root configs needed by tsup/tsconfig extends
COPY tsconfig.json ./
COPY tsup.config.base.ts ./tsup.config.base.ts

# Copy workspace source
COPY packages ./packages
COPY apps ./apps

# Install workspace deps
RUN pnpm install --frozen-lockfile

# Build shared + api
RUN pnpm --filter @zephyr/shared build
RUN pnpm --filter @zephyr/api build

# Create a portable prod bundle that includes workspace deps
RUN pnpm --filter @zephyr/api --prod deploy /prod/api


# ---------- runtime stage ----------
FROM node:24-alpine AS runtime
WORKDIR /app

COPY --from=build /prod/api ./

EXPOSE 5000
CMD ["node", "dist/index.js"]
