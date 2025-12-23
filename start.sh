#!/bin/bash

echo "Verificando atualizações no repositório..."

# Verifica se a pasta .git existe, se não, inicializa ou clona
if [ ! -d ".git" ]; then
    echo "Repositório não encontrado. Clonando..."
    git clone https://github.com/marcoantonioq/siga/ .
else
    echo "Atualizando código existente..."
    git fetch origin
    git reset --hard origin/main
fi

# Instala novas dependências caso o package.json tenha mudado
echo "Instalando/Atualizando dependências..."
npm install

# Inicia a aplicação
echo "Iniciando aplicação..."
exec node src/index.js