#!/usr/bin/env python3
"""
Utilitário de Backup e Disaster Recovery para o Google Drive
Compatível com Service Account (recomendado para servidores) e OAuth.
Aplica retenção automática de backups antigos (padrão: 30 dias).
"""

import os
import sys
import argparse
import datetime
from pathlib import Path
from typing import Optional

try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
except ImportError:
    print(
        "Erro: As bibliotecas do Google Drive não estão instaladas.\n"
        "Instale com: pip install google-api-python-client google-auth google-auth-httplib2 google-auth-oauthlib"
    )
    sys.exit(1)

SCOPES = ["https://www.googleapis.com/auth/drive.file"]


def get_drive_service():
    """Autentica com a API do Google Drive usando Service Account ou OAuth."""
    creds_path = os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS",
        str(Path(__file__).resolve().parent.parent / "credentials.json"),
    )

    if not os.path.exists(creds_path):
        raise FileNotFoundError(
            f"Arquivo de credenciais do Google Drive não encontrado em: {creds_path}\n"
            "Defina GOOGLE_APPLICATION_CREDENTIALS ou coloque credentials.json na raiz do projeto."
        )

    creds = service_account.Credentials.from_service_account_file(
        creds_path, scopes=SCOPES
    )
    return build("drive", "v3", credentials=creds)


def upload_backup(file_path: str, folder_id: Optional[str] = None, retention_days: int = 30):
    """Faz upload do arquivo de backup para a pasta especificada e aplica rotação/retenção."""
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"Arquivo de backup não encontrado: {file_path}")

    folder_id = folder_id or os.getenv("GOOGLE_DRIVE_FOLDER_ID")
    if not folder_id:
        raise ValueError(
            "ID da pasta do Google Drive não especificado. "
            "Defina GOOGLE_DRIVE_FOLDER_ID no arquivo .env ou passe via argumento --folder-id."
        )

    service = get_drive_service()
    filename = path.name

    file_metadata = {
        "name": filename,
        "parents": [folder_id],
        "description": f"Backup automatizado do banco PostgreSQL Wallet gerado em {datetime.datetime.now().isoformat()}",
    }

    media = MediaFileUpload(
        str(path),
        mimetype="application/octet-stream",
        resumable=True,
    )

    print(f"[*] Iniciando upload do backup '{filename}' ({path.stat().st_size / 1024 / 1024:.2f} MB)...")
    request = service.files().create(body=file_metadata, media_body=media, fields="id, name, size")
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"    Progresso: {int(status.progress() * 100)}%")

    file_id = response.get("id")
    print(f"[+] Backup concluído com sucesso! ID no Google Drive: {file_id}")

    # Aplica política de retenção (limpeza de backups antigos)
    if retention_days > 0:
        apply_retention_policy(service, folder_id, retention_days)

    return file_id


def apply_retention_policy(service, folder_id: str, retention_days: int):
    """Remove backups na pasta do Google Drive anteriores a retention_days."""
    cutoff_date = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=retention_days)
    cutoff_iso = cutoff_date.isoformat()

    query = (
        f"'{folder_id}' in parents and trashed = false and "
        f"mimeType != 'application/vnd.google-apps.folder' and "
        f"createdTime < '{cutoff_iso}'"
    )

    results = service.files().list(
        q=query,
        spaces="drive",
        fields="files(id, name, createdTime)",
        pageSize=100,
    ).execute()

    files_to_delete = results.get("files", [])
    if files_to_delete:
        print(f"[*] Aplicando retenção de {retention_days} dias: {len(files_to_delete)} backup(s) antigo(s) para purga...")
        for f in files_to_delete:
            print(f"    - Removendo {f['name']} (criado em {f['createdTime']})...")
            service.files().delete(fileId=f["id"]).execute()
        print("[+] Limpeza de retenção concluída.")
    else:
        print(f"[i] Nenhum backup anterior a {retention_days} dias precisa ser removido.")


def list_backups(folder_id: Optional[str] = None):
    """Lista backups disponíveis na pasta do Google Drive."""
    folder_id = folder_id or os.getenv("GOOGLE_DRIVE_FOLDER_ID")
    if not folder_id:
        raise ValueError("GOOGLE_DRIVE_FOLDER_ID não configurado.")

    service = get_drive_service()
    query = f"'{folder_id}' in parents and trashed = false"

    results = service.files().list(
        q=query,
        spaces="drive",
        fields="files(id, name, size, createdTime)",
        orderBy="createdTime desc",
        pageSize=30,
    ).execute()

    files = results.get("files", [])
    if not files:
        print("[i] Nenhum arquivo encontrado na pasta do Google Drive.")
        return []

    print(f"\n{'='*75}")
    print(f"{'Nome do Arquivo':<40} | {'Tamanho':<10} | {'Data de Criação':<20}")
    print(f"{'='*75}")
    for f in files:
        size_mb = f"{int(f.get('size', 0)) / 1024 / 1024:.2f} MB" if 'size' in f else "N/A"
        print(f"{f['name']:<40} | {size_mb:<10} | {f.get('createdTime', ''):<20}")
    print(f"{'='*75}\n")
    return files


def download_backup(file_id: str, output_path: str):
    """Baixa um backup do Google Drive para restauração."""
    service = get_drive_service()
    request = service.files().get_media(fileId=file_id)

    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    print(f"[*] Baixando arquivo {file_id} para '{output_path}'...")
    with open(output_path, "wb") as fh:
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
            if status:
                print(f"    Progresso: {int(status.progress() * 100)}%")

    print(f"[+] Download concluído: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Backup e Restore do Wallet no Google Drive")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Upload
    upload_parser = subparsers.add_parser("upload", help="Faz upload de um arquivo de dump para o Drive")
    upload_parser.add_argument("file", help="Caminho do arquivo de dump (.dump ou .sql.gz)")
    upload_parser.add_argument("--folder-id", help="ID da pasta do Google Drive (ou via GOOGLE_DRIVE_FOLDER_ID)")
    upload_parser.add_argument("--retention", type=int, default=30, help="Dias de retenção (padrão: 30)")

    # List
    list_parser = subparsers.add_parser("list", help="Lista backups na pasta do Drive")
    list_parser.add_argument("--folder-id", help="ID da pasta do Google Drive")

    # Download
    download_parser = subparsers.add_parser("download", help="Baixa um backup do Drive")
    download_parser.add_argument("file_id", help="ID do arquivo no Google Drive")
    download_parser.add_argument("output", help="Caminho de saída para salvar o arquivo")

    args = parser.parse_args()

    try:
        if args.command == "upload":
            upload_backup(args.file, args.folder_id, args.retention)
        elif args.command == "list":
            list_backups(args.folder_id)
        elif args.command == "download":
            download_backup(args.file_id, args.output)
    except Exception as e:
        print(f"[!] Erro na operação: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
