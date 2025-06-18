FROM node:22-slim

RUN apt-get update && apt-get install -y ca-certificates fonts-liberation libasound2 libnss3 libx11-xcb1 libxcomposite1 libxrandr2 libgtk-3-0 libgbm-dev libappindicator3-1 xdg-utils chromium git \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

USER node

WORKDIR /app

RUN git clone https://github.com/marcoantonioq/siga.git . && npm install

RUN chmod +x /app/start.sh

EXPOSE 3009

CMD ["./start.sh"]
