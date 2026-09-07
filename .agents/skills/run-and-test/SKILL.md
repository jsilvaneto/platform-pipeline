---
name: run-and-test
description: >-
  Use this skill when the user asks to start the project, run health checks,
  execute linting or build tests in backend and frontend.
---

# Procedimentos de Execução, Validação e Testes

Este guia resume os comandos padrão para verificar a integridade da aplicação.

## 1. Execução do Sistema
- **Iniciar em modo Docker Dev (Hot-Reload)**:
  `./start.sh --dev`
- **Iniciar em modo Nativo (Local com venv e Vite)**:
  `./start.sh --native`
- **Iniciar em modo Produção Docker**:
  `./start.sh`
- **Encerrar containers**:
  `./start.sh --stop`

## 2. Teste de Saúde da API
Verifique se a API está respondendo:
```bash
curl -f http://localhost:8000/api/health
```
Resposta esperada:
```json
{"status": "healthy", "database": "sqlite_wal"}
```

## 3. Validação do Frontend
- **Compilação e validação de tipos TypeScript**:
  ```bash
  cd frontend && npm run build
  ```
- **Linting com Oxlint**:
  ```bash
  cd frontend && npm run lint
  ```

## 4. Validação de Sintaxe do Backend
Verifique se não há erros de import ou sintaxe no backend:
```bash
python3 -m py_compile backend/app/main.py
```
