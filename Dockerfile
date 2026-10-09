# Container único: a API Express serve /api e os builds do shell e dos dois MFEs na mesma origem.

# ---- build dos front-ends ----
FROM node:24-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY apps/shell/package.json apps/shell/
COPY apps/mfe-carteiras/package.json apps/mfe-carteiras/
COPY apps/mfe-acoes/package.json apps/mfe-acoes/
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build
# Em produção os remotes ficam em subpastas da mesma origem (em dev, :4201 e :4202).
RUN printf '{\n  "mfe-carteiras": "/mfe-carteiras/remoteEntry.json",\n  "mfe-acoes": "/mfe-acoes/remoteEntry.json"\n}\n' \
      > apps/shell/dist/shell/browser/federation.manifest.json

# ---- dependências da API (better-sqlite3 é nativo) ----
FROM node:24-bookworm-slim AS api-deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
RUN npm ci --workspace api

# ---- runtime ----
FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    PORT=3000 \
    SAFRA_DB=/data/safra.db \
    SAFRA_WEB=/app/web
WORKDIR /app
COPY --from=api-deps /app/node_modules ./node_modules
COPY package.json ./
COPY api ./api
COPY --from=web /app/apps/shell/dist/shell/browser ./web/shell
COPY --from=web /app/apps/mfe-carteiras/dist/mfe-carteiras/browser ./web/mfe-carteiras
COPY --from=web /app/apps/mfe-acoes/dist/mfe-acoes/browser ./web/mfe-acoes
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node_modules/.bin/tsx", "api/src/server.ts"]
