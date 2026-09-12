# Backend — multi-stage: Node build → Node runtime
FROM node:20-alpine AS build
WORKDIR /app
ENV DATABASE_URL=postgresql://sanctuary:sanctuary_dev@postgres:5432/sanctuary
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared/models/package.json ./packages/shared/models/package.json
COPY packages/api/products/package.json ./packages/api/products/package.json
RUN npm ci --legacy-peer-deps --ignore-scripts
COPY . .
RUN npx prisma generate --schema prisma/schema.prisma && \
    npx tsc -p apps/backend/tsconfig.build.json

FROM node:20-alpine AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared/models/package.json ./packages/shared/models/package.json
COPY packages/api/products/package.json ./packages/api/products/package.json
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/packages ./packages
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV CHRONOS_BASE_URL=http://chronos:8000
CMD ["node", "apps/backend/dist/main.js"]
