#!/bin/bash

cd /app

echo "🔄 Verificando atualizações do repositório..."
git config pull.ff only
git fetch --all
git pull

echo "📦 Instalando dependências..."
npm install

echo "🚀 Iniciando servidor..."
npx nodemon src/index.js
# node src/index.js