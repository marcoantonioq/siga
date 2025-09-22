
# Cria rede Docker se não existir
if ! docker network inspect dockers >/dev/null 2>&1; then
  echo "🌐 Criando rede Docker: dockers"
  docker network create --driver bridge dockers
else
  echo "✅ Rede Docker 'dockers' já existe."
fi