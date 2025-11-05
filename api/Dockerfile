FROM node:16-alpine

WORKDIR /app

# Kopeerime package.json
COPY package*.json ./

# Installime dependencies
RUN npm install

# Kopeerime kogu koodi
COPY . .

# Avame port
EXPOSE 3000

# Käivitame
CMD ["node", "server.js"]