#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Carrega variáveis de ambiente se existir arquivo .env
if [ -f "$PROJECT_ROOT/.env" ]; then
    # shellcheck disable=SC2046
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

VERSION=$(cat "$PROJECT_ROOT/VERSION" 2>/dev/null | tr -d ' \r\n' || echo "1.0.0")

# Sincroniza arquivos de versionamento para o backend (acesso nativo e docker)
cp "$PROJECT_ROOT/VERSION" "$PROJECT_ROOT/backend/VERSION" 2>/dev/null || true
cp "$PROJECT_ROOT/CHANGELOG.md" "$PROJECT_ROOT/backend/CHANGELOG.md" 2>/dev/null || true

MODE="${1:-prod}"

# 1. Encerramento de containers
if [ "$MODE" = "--stop" ] || [ "$MODE" = "stop" ] || [ "$MODE" = "--down" ] || [ "$MODE" = "down" ]; then
    echo "================================================================="
    echo "  🛑 ENCERRANDO CONTAINERS DO PROJETO..."
    echo "================================================================="
    docker compose down 2>/dev/null || true
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true
    echo "[✓] Containers finalizados com sucesso."
    exit 0
fi

# 2. Execução nativa (sem Docker)
if [ "$MODE" = "--native" ] || [ "$MODE" = "native" ]; then
    echo "================================================================="
    echo "  🚀 INICIANDO EM MODO NATIVO (SEM DOCKER)..."
    echo "================================================================="
    
    # 2.0 Inicia container PostgreSQL caso Docker esteja instalado
    if command -v docker >/dev/null 2>&1; then
        echo "[*] Garantindo serviço PostgreSQL ativo (docker compose up -d postgres)..."
        docker compose up -d postgres 2>/dev/null || true
    fi

    # 2.1 Backend venv
    if [ ! -d "$PROJECT_ROOT/backend/venv" ]; then
        echo "[!] Criando ambiente virtual venv e instalando pacotes..."
        python3 -m venv "$PROJECT_ROOT/backend/venv"
        "$PROJECT_ROOT/backend/venv/bin/pip" install --upgrade pip
        "$PROJECT_ROOT/backend/venv/bin/pip" install -r "$PROJECT_ROOT/backend/requirements.txt"
    fi

    # 2.2 Frontend dependências
    if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
        echo "[!] Instalando dependências do frontend via npm install..."
        (cd "$PROJECT_ROOT/frontend" && npm install)
    fi

    cleanup() {
        echo ""
        echo "[*] Encerrando serviços locais..."
        kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
        echo "[✓] Processos encerrados."
        exit 0
    }
    trap cleanup SIGINT SIGTERM

    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate
    uvicorn app.main:app --reload --host 0.0.0.0 --port "${BACKEND_PORT:-8000}" &
    BACKEND_PID=$!

    cd "$PROJECT_ROOT/frontend"
    npm run dev -- --host &
    FRONTEND_PID=$!
    wait
    exit 0
fi

# 3. Execução Docker com Hot-Reload (Dev)
if [ "$MODE" = "--dev" ] || [ "$MODE" = "dev" ]; then
    echo "================================================================="
    echo "  🚀 INICIANDO EM MODO DESENVOLVIMENTO DOCKER (HOT-RELOAD)..."
    echo "================================================================="
    docker compose -f docker-compose.dev.yml up --build
    exit 0
fi

# 4. Execução Padrão: Docker Compose Produção
echo "================================================================="
echo "  🚀 INICIANDO O SISTEMA (Versão v$VERSION - Docker Produção)"
echo "================================================================="

docker compose up -d --build

echo ""
echo "================================================================="
echo "  ✅ SISTEMA ONLINE E EM EXECUÇÃO!"
echo "================================================================="
echo "  💻 Acesso Local (Navegador):"
echo "     ➜ Web App:          http://localhost:${FRONTEND_PORT:-5173}"
echo "     ➜ Backend Swagger:  http://localhost:${BACKEND_PORT:-8000}/docs"
echo "     ➜ API Health:       http://localhost:${BACKEND_PORT:-8000}/api/health"
echo "-----------------------------------------------------------------"
echo "  Comandos Úteis:"
echo "  ➜ Parar o sistema:         ./start.sh --stop"
echo "  ➜ Modo dev com reload:     ./start.sh --dev"
echo "  ➜ Modo nativo (sem Docker): ./start.sh --native"
echo "  ➜ Ver logs dos containers: docker compose logs -f"
echo "================================================================="
echo ""
