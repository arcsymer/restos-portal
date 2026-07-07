# syntax=docker/dockerfile:1

# --- build: install deps (postinstall runs `prisma generate`) and compile ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# --- runtime: reuse installed node_modules (incl. prisma CLI + generated client) ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL="file:/app/data/dev.db"
RUN corepack enable \
 && groupadd -r app && useradd -r -g app app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
RUN mkdir -p /app/data && chown -R app:app /app/data
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# apply migrations, seed once (marker in the data volume), then run
CMD ["sh","-c","set -e; mkdir -p /app/data; node_modules/.bin/prisma migrate deploy; if [ ! -f /app/data/.seeded ]; then node_modules/.bin/prisma db seed && touch /app/data/.seeded || true; fi; exec node dist/main"]
