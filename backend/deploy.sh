#!/bin/bash
SERVER=${1:-"YOUR_IP"}
API_KEY=${2:-""}
echo "Deploy su $SERVER..."
rsync -avz --exclude='.env' --exclude='__pycache__' --exclude='venv' ./backend/ root@$SERVER:/opt/winepair/
ssh root@$SERVER "
  cd /opt/winepair
  command -v docker || curl -fsSL https://get.docker.com | sh
  if [ -n '$API_KEY' ]; then
    echo 'OPENROUTER_API_KEY=$API_KEY' > .env
    echo 'DEFAULT_MODEL=google/gemma-4-31b-it:free' >> .env
    echo '✅ API key configurata'
  elif [ ! -f .env ]; then
    cp .env.example .env
    echo '⚠️  .env creato da .env.example — verifica la API key'
  else
    echo 'ℹ️  .env esistente, uso quello'
  fi
  docker compose down 2>/dev/null; docker compose up -d --build
  echo '✅ API online: http://$SERVER:8000'
  echo '📖 Docs: http://$SERVER:8000/docs'
"
