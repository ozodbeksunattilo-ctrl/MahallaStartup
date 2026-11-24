# Railway / har qanday konteyner hosting uchun. Lokal ishlash uchun shart emas.
FROM node:22-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
