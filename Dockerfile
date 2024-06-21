# Stage 1: Build the frontend
FROM node:18 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN yarn install
COPY frontend/ .
RUN yarn run build

# Stage 2: Build the backend
FROM node:18 AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN yarn install
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN yarn run build

# Stage 3: Setup runtime environment
FROM node:18 AS runtime
WORKDIR /app
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=frontend-build /app/backend/public ./public

EXPOSE 3001
CMD ["node", "dist/index.js"]
