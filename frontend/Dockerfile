# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for the Aakar frontend.
#
#   docker build --target dev  -t aakar-web:dev  .
#   docker build --target prod -t aakar-web:prod --build-arg VITE_API_URL=https://api.example.com .

###################################################################
# 1. base — Node + pnpm + dependencies
###################################################################
FROM node:22-alpine AS base
WORKDIR /app

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=1

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

###################################################################
# 2. dev — runs Vite dev server with HMR (source is bind-mounted)
###################################################################
FROM base AS dev

EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

###################################################################
# 3. build — produces static assets in /app/dist
###################################################################
FROM base AS build
COPY . .
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

###################################################################
# 4. prod — nginx serving the static bundle
###################################################################
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
