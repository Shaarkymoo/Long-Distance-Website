# Stage 1: Build Svelte client
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev
COPY server/ ./

# Stage 3: Production image
FROM node:22-alpine
WORKDIR /app
COPY --from=server-builder /app/server ./server
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=client-builder /app/client/dist ./client/dist
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server/index.js"]
