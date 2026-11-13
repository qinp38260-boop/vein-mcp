FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY index.js README.md ./

# 由平台注入；用户自己的 key 通过 MCP 客户端 env 传入
ENV VEIN_API_TOKEN=""
ENV VEIN_BASE_URL="https://cloud.ygwws.xyz"

CMD ["node", "index.js"]
