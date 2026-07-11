# ---- build stage ----
FROM node:20-slim AS build
WORKDIR /app

COPY package*.json ./
# npm install (not `npm ci`) so platform-specific native deps (Tailwind v4 oxide /
# lightningcss) resolve for the Linux build host regardless of where the lockfile
# was generated.
RUN npm install --no-audit --no-fund

COPY . .

# API base is baked into the client bundle at build time (NEXT_PUBLIC_*).
# Override for remote deploys, e.g. --build-arg NEXT_PUBLIC_API_BASE=https://api.example.com
ARG NEXT_PUBLIC_API_BASE=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
RUN npm run build

# ---- run stage ----
FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
