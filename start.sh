#!/bin/bash
# Verifique se há atualizações no repositório
git pull origin main

# Instale dependências, caso existam novas
npm install

# Inicie o servidor
npm start
