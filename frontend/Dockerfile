# Stage 1: Build da aplicação React 19 com Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências aproveitando cache de camadas do Docker
COPY package*.json ./
RUN npm ci

# Copia o código-fonte e compila para produção
COPY . .
RUN npm run build

# Stage 2: Servidor Nginx Alpine para distribuição de alta performance
FROM nginx:1.27-alpine

# Remove configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copia os artefatos compilados do Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração personalizada com SPA routing e Proxy Reverso
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck do Nginx
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
