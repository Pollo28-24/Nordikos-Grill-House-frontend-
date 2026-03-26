# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generar build de producción (browser + server)
RUN npm run build

# Stage 2: Run
FROM node:20-alpine

WORKDIR /app

# Copiamos solo lo necesario del build anterior
COPY --from=build /app/dist/Nordikos_Grill_House ./dist/Nordikos_Grill_House
COPY --from=build /app/package*.json ./

# Instalamos solo dependencias de producción
RUN npm install --omit=dev

# El puerto 4000 es el estándar para Angular SSR
EXPOSE 4000

# Usamos la ruta exacta del archivo generado por Angular
CMD ["node", "dist/Nordikos_Grill_House/server/server.mjs"]
