#!/bin/bash
SERVER=${1:-"YOUR_IP"}
echo "Deploy su $SERVER..."
rsync -avz --exclude='.env' --exclude='__pycache__' ./backend/ root@$SERVER:/opt/winepair/
ssh root@$SERVER "
  cd /opt/winepair
  command -v docker || curl -fsSL https://get.docker.com | sh
  [ -f .env ] || { cp .env.example .env && echo 'ATTENZIONE: configura /opt/winepair/.env con la tua API key'; }
  docker compose down 2>/dev/null; docker compose up -d --build
  echo '✅ API online: http://$SERVER:8000'
  echo '📖 Docs: http://$SERVER:8000/docs'
"
