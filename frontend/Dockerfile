# syntax=docker/dockerfile:1

# ── Stage 1 : build Angular ──
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    for i in 1 2 3 4 5; do \
      npm install && break || \
      { echo ">>> Tentative $i echouee (incident reseau probable), nouvel essai dans 15s..."; sleep 15; }; \
    done
COPY . .
RUN npm run build -- --configuration production

# ── Stage 2 : Nginx ──
FROM nginx:1.27-alpine
COPY --from=build /app/dist/tunisys-ats-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
