#!/usr/bin/env bash
# ==============================================================================
# Script de Disaster Recovery / Restauração do PostgreSQL (Armazenamento Local / Host WSL)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${ROOT_DIR}/backups"

echo "================================================================"
echo " [WALLET] Recuperação de Desastres / Restauração de Banco de Dados"
echo "================================================================"

if [ -f "${ROOT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    export $(grep -v '^#' "${ROOT_DIR}/.env" | xargs -d '\n' 2>/dev/null || true)
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-wallet}"

if [ $# -eq 0 ]; then
    echo "Uso:"
    echo "  $0 <caminho_do_arquivo_dump_local>"
    echo "Exemplo: $0 backups/wallet_backup_20260913_120000.dump"
    exit 1
fi

RESTORE_FILE="$1"

if [ ! -f "$RESTORE_FILE" ]; then
    echo "[!] Arquivo não encontrado: $RESTORE_FILE"
    exit 1
fi

echo ""
echo "ATENÇÃO: A restauração substituirá todos os dados da base '${POSTGRES_DB}'!"
read -p "Deseja continuar com a restauração de '$RESTORE_FILE'? (s/N): " -r CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
    echo "Operação cancelada pelo usuário."
    exit 0
fi

echo "[*] Restaurando banco de dados a partir do dump..."
if docker ps --format '{{.Names}}' | grep -q 'app_postgres'; then
    docker exec -i app_postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$RESTORE_FILE" || true
else
    echo "[*] Subindo container postgres temporário..."
    docker compose -f "${ROOT_DIR}/docker-compose.yml" up -d postgres
    sleep 3
    docker compose -f "${ROOT_DIR}/docker-compose.yml" exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$RESTORE_FILE" || true
fi

echo "[+] Restauração finalizada com sucesso!"
echo "================================================================"
