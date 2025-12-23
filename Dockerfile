FROM node:22-slim

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    ca-certificates fonts-liberation libasound2 libnss3 \
    libx11-xcb1 libxcomposite1 libxrandr2 libgtk-3-0 \
    libgbm-dev chromium git bash \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Configurações do Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

EXPOSE 3009