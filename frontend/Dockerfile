# Stage 1: Compilação dos arquivos estáticos com Node 20
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Servidor de produção com Nginx Alpine
FROM nginx:1.27-alpine

# Limpa configuração padrão
RUN rm -rf /etc/nginx/conf.d/*

# Copia build gerado
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração com SPA fallback e Proxy Reverso
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
