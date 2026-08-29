#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 1. Determina a versão a ser compilada
if [ -n "$1" ]; then
    VERSION="$1"
    echo "$VERSION" > VERSION
    sed -i "s/^WALLET_VERSION=.*/WALLET_VERSION=$VERSION/" .env 2>/dev/null || echo "WALLET_VERSION=$VERSION" >> .env
else
    VERSION=$(cat VERSION 2>/dev/null | tr -d ' \r\n')
    if [ -z "$VERSION" ]; then
        VERSION="1.0.0"
        echo "$VERSION" > VERSION
    fi
fi

echo "=========================================================="
echo "   GERANDO RELEASE DOCKER DO WALLET (Versão v$VERSION)"
echo "=========================================================="
echo ""

# 2. Build e Tagging da Imagem do Backend
echo "[+] Compilando imagem do Backend (wallet-backend:$VERSION e latest)..."
docker build \
    -t "wallet-backend:$VERSION" \
    -t "wallet-backend:latest" \
    -f backend/Dockerfile ./backend

echo ""

# 3. Build e Tagging da Imagem do Frontend
echo "[+] Compilando imagem do Frontend (wallet-frontend:$VERSION e latest)..."
docker build \
    -t "wallet-frontend:$VERSION" \
    -t "wallet-frontend:latest" \
    -f frontend/Dockerfile ./frontend

echo ""
echo "=========================================================="
echo "  [✓] IMAGENS GERADAS COM SUCESSO PARA A VERSÃO v$VERSION!"
echo "=========================================================="
echo ""
docker images | grep -E "REPOSITORY|wallet-"
echo ""
echo "Para rodar esta versão em produção via Docker Compose:"
echo "➜ docker compose up -d"
echo "=========================================================="
