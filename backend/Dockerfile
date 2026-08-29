# Dockerfile para o Backend FastAPI do Wallet
FROM python:3.10-slim

# Evita geração de arquivos .pyc e faz o stdout/stderr descarregar imediatamente
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Instala utilitários necessários para compilação e healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instala as dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia o código-fonte da aplicação
COPY . .

# Cria os diretórios para o banco de dados SQLite WAL e anexos
RUN mkdir -p /app/data /app/data/attachments

EXPOSE 8000

# Healthcheck interno do container
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
