#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Leitura da versão atual
VERSION=$(cat VERSION 2>/dev/null | tr -d ' \r\n' || echo "1.0.0")

# Tratamento de parâmetros
MODE="${1:-prod}"

if [ "$MODE" = "--stop" ] || [ "$MODE" = "stop" ] || [ "$MODE" = "--down" ] || [ "$MODE" = "down" ]; then
    echo "================================================================="
    echo "  🛑 ENCERRANDO CONTAINERS DO WALLET..."
    echo "================================================================="
    docker compose down 2>/dev/null || true
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true
    echo "[✓] Containers finalizados com sucesso. Seus dados continuam salvos no volume."
    exit 0
fi

if [ "$MODE" = "--native" ] || [ "$MODE" = "native" ]; then
    echo "================================================================="
    echo "  🚀 INICIANDO WALLET EM MODO NATIVO (SEM DOCKER)..."
    echo "================================================================="
    
    # 1. Validação do ambiente virtual do Backend
    if [ ! -d "$PROJECT_ROOT/backend/venv" ]; then
        echo "[!] Criando venv e instalando pacotes..."
        python3 -m venv "$PROJECT_ROOT/backend/venv"
        "$PROJECT_ROOT/backend/venv/bin/pip" install --upgrade pip
        "$PROJECT_ROOT/backend/venv/bin/pip" install -r "$PROJECT_ROOT/backend/requirements.txt"
    fi

    # 2. Validação dos módulos do Frontend
    if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
        (cd "$PROJECT_ROOT/frontend" && npm install)
    fi

    cleanup() {
        echo ""
        echo "[*] Encerrando serviços nativos do Wallet..."
        kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
        echo "[✓] Serviços finalizados."
        exit 0
    }
    trap cleanup SIGINT SIGTERM

    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!

    cd "$PROJECT_ROOT/frontend"
    npm run dev -- --host &
    FRONTEND_PID=$!
    wait
    exit 0
fi

if [ "$MODE" = "--dev" ] || [ "$MODE" = "dev" ]; then
    echo "================================================================="
    echo "  🚀 INICIANDO WALLET EM MODO DESENVOLVIMENTO (DOCKER HOT-RELOAD)..."
    echo "================================================================="
    docker compose -f docker-compose.dev.yml up
    exit 0
fi

# =================================================================
# Modo Padrão: DOCKER COMPOSE PRODUÇÃO (Nginx SPA + FastAPI)
# =================================================================
echo "================================================================="
echo "  🚀 INICIANDO O ECOSSISTEMA WALLET (Versão v$VERSION - Docker)"
echo "================================================================="

# 1. Inicia os containers em segundo plano
docker compose up -d

# 2. Detecção de IP da rede local / Wi-Fi
WINDOWS_LAN_IP=""
if command -v ipconfig.exe >/dev/null 2>&1; then
    WINDOWS_LAN_IP=$(timeout 1.5 ipconfig.exe < /dev/null 2>/dev/null | grep -i "IPv4" | grep -v "172." | grep -v "169.254." | grep -v "192.168.56." | awk -F: '{print $2}' | tr -d ' \r' | head -n 1)
fi

echo ""
echo "================================================================="
echo "  ✅ WALLET ONLINE E EM EXECUÇÃO!"
echo "================================================================="
echo "  💻 Acesso Local (Navegador no Windows):"
echo "     ➜ Web App:          http://localhost:5173"
echo "     ➜ Backend Swagger:  http://localhost:8000/docs"
echo ""
if [ -n "$WINDOWS_LAN_IP" ]; then
echo "  📱 Rede Local / Wi-Fi (Celular & Dispositivo Android Físico):"
echo "     ➜ IP do Computador: $WINDOWS_LAN_IP"
echo "     ➜ Backend URL:      http://${WINDOWS_LAN_IP}:8000"
echo "     ➜ Web App na Rede:  http://${WINDOWS_LAN_IP}:5173"
echo ""
fi
echo "  🤖 Emulador Android Studio:"
echo "     ➜ Backend URL:      http://10.0.2.2:8000"
echo "-----------------------------------------------------------------"
echo "  Comandos Úteis:"
echo "  ➜ Para parar o sistema:    ./start.sh --stop"
echo "  ➜ Para modo dev com reload: ./start.sh --dev"
echo "  ➜ Para ver os logs:        docker compose logs -f"
echo "================================================================="
echo ""
