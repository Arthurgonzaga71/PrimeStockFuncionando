# Usa imagem oficial Node.js
FROM node:20-alpine

# Diretório de trabalho no container
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências
RUN npm install --production

# Copia todo o backend pro container
COPY . .

# Expõe a porta que o Node vai rodar
EXPOSE 4000

# Comando para rodar o servidor
CMD ["node", "server.js"]