#!/usr/bin/env bash

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "       INICIANDO O SISTEMA WALLET       "
echo "========================================"

# 1. Validação do ambiente virtual do Backend
if [ ! -d "$PROJECT_ROOT/backend/venv" ]; then
    echo "[!] Ambiente virtual do backend não encontrado."
    echo "    Criando venv e instalando pacotes..."
    python3 -m venv "$PROJECT_ROOT/backend/venv"
    "$PROJECT_ROOT/backend/venv/bin/pip" install --upgrade pip
    "$PROJECT_ROOT/backend/venv/bin/pip" install -r "$PROJECT_ROOT/backend/requirements.txt"
fi

# 2. Validação dos módulos do Frontend
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "[!] Módulos do frontend não encontrados."
    echo "    Instalando dependências via npm..."
    (cd "$PROJECT_ROOT/frontend" && npm install)
fi

# 3. Função para encerrar todos os processos filhos ao sair
cleanup() {
    echo ""
    echo "[*] Encerrando serviços do Wallet..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    echo "[✓] Serviços finalizados com sucesso."
    exit 0
}

trap cleanup SIGINT SIGTERM

# 4. Inicialização do Backend (FastAPI / Uvicorn)
echo "[+] Inicializando Backend..."
cd "$PROJECT_ROOT/backend"
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 5. Inicialização do Frontend (Vite)
echo "[+] Inicializando Frontend..."
cd "$PROJECT_ROOT/frontend"
npm run dev -- --host &
FRONTEND_PID=$!

# 6. Detecção do IP real do Computador (Windows Host / Wi-Fi) e WSL
WINDOWS_LAN_IP=""
if command -v ipconfig.exe >/dev/null 2>&1; then
    WINDOWS_LAN_IP=$(timeout 1.5 ipconfig.exe < /dev/null 2>/dev/null | grep -i "IPv4" | grep -v "172." | grep -v "169.254." | grep -v "192.168.56." | awk -F: '{print $2}' | tr -d ' \r' | head -n 1)
fi
WSL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

echo ""
echo "================================================================="
echo "  🚀 WALLET EM EXECUÇÃO (BACKEND + FRONTEND WEB)"
echo "================================================================="
echo "  💻 Localhost (Navegador no Windows):"
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
echo ""
if [ -n "$WSL_IP" ]; then
echo "  🐧 WSL Virtual IP (eth0):"
echo "     ➜ IP interno:       ${WSL_IP}"
echo ""
fi
echo "  💡 Dica para Celular no Wi-Fi: Se não conseguir conectar pelo IP do"
echo "     computador, execute o script 'expose_wsl_ports.ps1' no PowerShell"
echo "     do Windows como Administrador (ou use networkingMode=mirrored)."
echo "-----------------------------------------------------------------"
echo "  Pressione Ctrl + C para encerrar os serviços."
echo "================================================================="
echo ""

# Mantém o script aguardando os processos
wait
