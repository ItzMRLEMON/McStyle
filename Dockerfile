# Build stage - compile frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# API stage - Express backend
FROM node:20-alpine AS api
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 5858
CMD ["node", "server.js"]

