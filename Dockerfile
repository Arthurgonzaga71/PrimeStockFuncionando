# Base sólida, igual tradição de família
FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app

# Copia só o essencial primeiro (cache inteligente)
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o resto do projeto
COPY . .

# Build (se tiver)
RUN npm run build || echo "sem build"

# Porta padrão (ajuste se precisar)
EXPOSE 3000

# Start
CMD ["npm", "start"]
