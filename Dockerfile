FROM node:22-slim

# Dependências do sistema (Chromium + Puppeteer)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    libgtk-3-0 \
    libgbm-dev \
    chromium \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Variáveis do Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Copia apenas arquivos de dependência primeiro (cache de build)
COPY package*.json ./

RUN npm ci --omit=dev

# Agora copia TODO o projeto
COPY . .

EXPOSE 3009

CMD ["node", "src/index.js"]
