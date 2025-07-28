#!/bin/bash

# set -e  # Para o script se qualquer comando falhar

echo "🔄 Verificando atualizações do repositório..."
git config pull.ff only

# Faz fetch de todos os remotos e puxa o branch atual
git reset --hard 
git fetch --all
git pull

# Cria rede Docker se não existir
if ! docker network inspect dockers >/dev/null 2>&1; then
  echo "🌐 Criando rede Docker: dockers"
  docker network create --driver bridge dockers
else
  echo "✅ Rede Docker 'dockers' já existe."
fi

# Instala dependências se necessário
echo "📦 Instalando dependências..."
npm install

# Inicia o servidor
echo "🚀 Iniciando servidor..."
npm start