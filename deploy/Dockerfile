# syntax=docker/dockerfile:1

# --- 1. Build frontendu -------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Adres API można też ustawić w Ustawieniach aplikacji po wdrożeniu.
# Puste VITE_API_BASE_URL = żądania /api trafiają do tego samego origin (nginx proxy).
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# --- 2. Serwowanie przez nginx ------------------------------------------------
FROM nginx:1.27-alpine

# Szablon jest przetwarzany przez envsubst przy starcie kontenera.
COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Domyślnie backend na hoście (docker-compose dodaje host-gateway).
ENV BACKEND_URL=http://host.docker.internal:8000

EXPOSE 80
