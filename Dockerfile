# Image du linktree AyLabs : build Vite puis service statique par nginx.
#   docker build -t aylabs-linktree .
#
# links.json est lu AU BUILD : chaque modification du fichier demande une
# nouvelle image (c'est le rôle du workflow GitHub à chaque push sur main).

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts index.html links.json ./
COPY vite ./vite
COPY public ./public
COPY src ./src

RUN npm run build


FROM nginx:stable-alpine

# Gabarit traité au démarrage : fournit le résolveur DNS du relais
# /youtube-stats.json (voir docker/nginx.conf.template).
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /app/dist ./

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
