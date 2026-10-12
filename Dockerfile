FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile --filter "@cura/api..."
RUN pnpm --filter @cura/db-client exec prisma generate
ENV NODE_ENV=production
EXPOSE 4000
CMD ["pnpm", "--filter", "@cura/api", "start"]
