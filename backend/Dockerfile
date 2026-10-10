# ---- Base -------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

# ---- Development (tsx watch, used by docker-compose) -----------------------
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- Build ------------------------------------------------------------------
FROM base AS build
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ---- Production (compiled JS, runtime deps only) ---------------------------
FROM base AS production
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /usr/src/app/dist ./dist
COPY migrations ./migrations
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
