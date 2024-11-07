# Use uma imagem Node.js leve como base
FROM node:22-slim

# Instale as dependências do sistema para Chromium e Git
RUN apt-get update && apt-get install -y ca-certificates fonts-liberation libasound2 libnss3 libx11-xcb1 libxcomposite1 libxrandr2 libgtk-3-0 libgbm-dev libappindicator3-1 xdg-utils chromium git && rm -rf /var/lib/apt/lists/*

# Defina o usuário como 'node' para melhorar a segurança
USER node

# Defina o diretório de trabalho
WORKDIR /app

# Clone o repositório e instale as dependências
RUN git clone https://github.com/marcoantonioq/siga.git . && npm install

# Copie o script de atualização e inicialização
RUN chmod +x /app/start.sh

# Exponha a porta do aplicativo
EXPOSE 3000

# Execute o script de inicialização
CMD ["./start.sh"]
