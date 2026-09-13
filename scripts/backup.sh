#!/usr/bin/env bash
# ==============================================================================
# Script de Automação de Backup do PostgreSQL para Google Drive
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILENAME="wallet_backup_${TIMESTAMP}.dump"
DUMP_PATH="${BACKUP_DIR}/${DUMP_FILENAME}"

mkdir -p "$BACKUP_DIR"

echo "================================================================"
echo " [WALLET] Iniciando rotina de backup em: $(date)"
echo "================================================================"

# Carrega variáveis de ambiente se existirem
if [ -f "${ROOT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    export $(grep -v '^#' "${ROOT_DIR}/.env" | xargs -d '\n' 2>/dev/null || true)
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-wallet}"

echo "[*] Gerando dump binário do PostgreSQL (${POSTGRES_DB})..."

# Detecta se postgres está rodando em container Docker ou local
if docker ps --format '{{.Names}}' | grep -q 'app_postgres'; then
    echo "[*] Utilizando container 'app_postgres' em execução..."
    docker exec -t app_postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$DUMP_PATH"
elif command -v docker &>/dev/null && [ -f "${ROOT_DIR}/docker-compose.yml" ]; then
    echo "[*] Subindo temporariamente postgres via docker compose para dump..."
    docker compose -f "${ROOT_DIR}/docker-compose.yml" run --rm --no-deps postgres pg_dump -h postgres -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$DUMP_PATH" || {
        # Fallback: executa pg_dump dentro do container postgres existente
        docker compose -f "${ROOT_DIR}/docker-compose.yml" up -d postgres
        sleep 3
        docker compose -f "${ROOT_DIR}/docker-compose.yml" exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$DUMP_PATH"
        docker compose -f "${ROOT_DIR}/docker-compose.yml" stop postgres
    }
elif command -v pg_dump &>/dev/null; then
    echo "[*] Utilizando pg_dump local da máquina..."
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DUMP_PATH"
else
    echo "[!] Erro: Nenhum método disponível para executar pg_dump." >&2
    exit 1
fi

if [ ! -s "$DUMP_PATH" ]; then
    echo "[!] Erro: O arquivo de dump gerado está vazio ou não foi criado." >&2
    rm -f "$DUMP_PATH"
    exit 1
fi

DUMP_SIZE="$(du -h "$DUMP_PATH" | cut -f1)"
echo "[+] Dump gerado com sucesso: ${DUMP_PATH} (${DUMP_SIZE})"

# Upload para Google Drive
echo "[*] Executando upload para o Google Drive..."
if docker ps --format '{{.Names}}' | grep -q 'app_backend'; then
    docker exec -t app_backend python3 /app/../scripts/backup_gdrive.py upload "/app/../backups/${DUMP_FILENAME}"
elif command -v python3 &>/dev/null; then
    python3 "${SCRIPT_DIR}/backup_gdrive.py" upload "$DUMP_PATH"
else
    docker run --rm -v "${ROOT_DIR}:/workspace" -w /workspace app-backend:1.0.0 python3 scripts/backup_gdrive.py upload "backups/${DUMP_FILENAME}"
fi

echo "[+] Processo de backup e sincronização com Google Drive finalizado com sucesso!"
echo "================================================================"
