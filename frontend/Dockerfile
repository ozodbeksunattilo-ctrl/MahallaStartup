# Railway / har qanday konteyner hosting uchun. API_INTERNAL_URL build paytida kerak (Next rewrites).
FROM node:22-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG API_INTERNAL_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm build
ENV NODE_ENV=production
CMD ["pnpm", "start"]
