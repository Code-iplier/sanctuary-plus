# Frontend — multi-stage: Node build → Nginx runtime
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/shared/models/package.json ./packages/shared/models/package.json
COPY packages/shared/test-utils/package.json ./packages/shared/test-utils/package.json
COPY packages/api/products/package.json ./packages/api/products/package.json
RUN npm ci --legacy-peer-deps --ignore-scripts
COPY . .
RUN npx tsc --noEmit --project apps/frontend/tsconfig.json && \
    cd apps/frontend && npx vite build

FROM nginx:alpine AS runtime
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
