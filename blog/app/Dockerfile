FROM node:20-alpine
WORKDIR /usr/src/app

# 의존성 먼저 설치 → 소스만 바뀌면 이 층은 캐시 재사용
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src

ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
