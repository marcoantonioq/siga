#!/bin/bash

cd /app

echo "🔄 Verificando atualizações do repositório..."
git config pull.ff only
git fetch --all
git pull

# Cria rede Docker se não existir
# if ! docker network inspect dockers >/dev/null 2>&1; then
#   echo "🌐 Criando rede Docker: dockers"
#   docker network create --driver bridge dockers
# else
#   echo "✅ Rede Docker 'dockers' já existe."
# fi

echo "📦 Instalando dependências..."
npm install

echo "🚀 Iniciando servidor..."
npx nodemon src/index.js
# node src/index.js