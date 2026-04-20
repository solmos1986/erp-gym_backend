FROM node:18

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar los archivos de configuración de npm
COPY package*.json ./

# Instalar las dependencias
RUN npm install

# Copiar todo el código al contenedor
COPY . .

# Ejecutar las migraciones y el seed
RUN npx prisma migrate deploy --schema=prisma/schema.prisma  # Aplica las migraciones
RUN npx prisma db seed --schema=prisma/schema.prisma        # Ejecuta el seed

# Generar el cliente Prisma
RUN npx prisma generate

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["node", "src/server.js"]