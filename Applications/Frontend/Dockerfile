# syntax=docker/dockerfile:1

# ---- Build: type-check and bundle the SPA ---------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Vite inlines VITE_* values at build time, so they are build arguments, not runtime settings.
# (The Firebase web config is public by design: it identifies the project, it grants nothing.)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_API_BASE=/api
ARG VITE_FIREBASE_EMULATOR=

# Fail the build (not the browser) when the Firebase config is missing.
RUN : "${VITE_FIREBASE_API_KEY:?set --build-arg VITE_FIREBASE_API_KEY}" \
      "${VITE_FIREBASE_AUTH_DOMAIN:?set --build-arg VITE_FIREBASE_AUTH_DOMAIN}" \
      "${VITE_FIREBASE_PROJECT_ID:?set --build-arg VITE_FIREBASE_PROJECT_ID}" \
      "${VITE_FIREBASE_APP_ID:?set --build-arg VITE_FIREBASE_APP_ID}" \
  && npm run build \
  # Pre-compress text assets once, for nginx's gzip_static.
  && find dist -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.css' -o -name '*.html' \
       -o -name '*.svg' -o -name '*.json' \) -size +1k -exec gzip -9 -k {} +

# ---- Serve: static files + /api proxy -------------------------------------------------------
FROM nginx:1.27-alpine

ARG VITE_FIREBASE_AUTH_DOMAIN
# Runtime settings for deploy/nginx.conf.example (an nginx template, filled in at start-up).
ENV API_UPSTREAM=http://api:3000 \
    FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN} \
    NGINX_ENVSUBST_FILTER=^(API_UPSTREAM|FIREBASE_AUTH_DOMAIN)$

RUN rm /etc/nginx/conf.d/default.conf
COPY deploy/nginx.conf.example /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
