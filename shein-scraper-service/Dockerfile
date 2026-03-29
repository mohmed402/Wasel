# Build from repository root: docker build -f shein-scraper-service/Dockerfile .
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY lib/shein/scrapeCartItems.mjs ./lib/shein/scrapeCartItems.mjs
COPY shein-scraper-service/server.mjs ./shein-scraper-service/server.mjs

ENV PORT=3001
EXPOSE 3001

CMD ["node", "shein-scraper-service/server.mjs"]
