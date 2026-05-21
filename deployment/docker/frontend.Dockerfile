# Stage 1: Build React App
FROM node:20-alpine AS build-stage

WORKDIR /app

# Install deps first (layer cache); .npmrc enables legacy-peer-deps for openapi-typescript + TS 6
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund --prefer-offline || \
    npm install --legacy-peer-deps --no-audit --no-fund

# i18n lives outside frontend/ but is imported via Vite alias @i18n -> ../i18n/locales
COPY i18n /i18n
COPY frontend/ .

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY deployment/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
