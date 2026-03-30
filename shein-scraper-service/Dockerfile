# Build from repository root: docker build -f shein-scraper-service/Dockerfile .
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

# Use browsers baked into this image (under /ms-playwright). Do not re-download in postinstall:
# a fresh download targets ~/.cache and can miss OS libs like libglib on slim layers.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev --ignore-scripts

COPY lib/shein/scrapeCartItems.mjs ./lib/shein/scrapeCartItems.mjs
COPY shein-scraper-service/server.mjs ./shein-scraper-service/server.mjs

ENV PORT=3001
EXPOSE 3001

CMD ["node", "shein-scraper-service/server.mjs"]
