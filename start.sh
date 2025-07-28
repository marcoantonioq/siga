#!/bin/bash
# Verifique se há atualizações no repositório
git config pull.ff only
git pull --all

docker network create --driver bridge dockers

docker network create --driver bridge dockers

# Instale dependências, caso existam novas
npm install

# Inicie o servidor
npm start
