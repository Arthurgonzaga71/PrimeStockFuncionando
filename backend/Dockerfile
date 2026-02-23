FROM node:18

WORKDIR /app

# Copiar TUDO (incluindo node_modules)
COPY . .

# Listar o conteúdo para debug
RUN echo "=== CONTEÚDO DO /APP ===" && ls -la && \
    echo "=== NODE_MODULES ===" && ls -la node_modules || echo "node_modules vazio"

EXPOSE 4000

CMD ["node", "server.js"]