FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN apk --no-cache --virtual build-dependencies add python3 make g++ \
    && npm install --production

COPY . .

RUN mkdir -p ./public ./data \
    && cd ./client \
    && npm install --production --legacy-peer-deps \
    && npm run build \
    && cd .. \
    && mv ./client/build/* ./public \
    && rm -rf ./client

FROM node:20-alpine

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont su-exec

COPY --from=builder /app /app

COPY .docker/chromium.sh /usr/local/bin/flame-chromium
RUN chmod 755 /usr/local/bin/flame-chromium

WORKDIR /app

EXPOSE 5005

ENV NODE_ENV=production
ENV PASSWORD=flame_password
ENV FAVICON_CHROMIUM_PATH=/usr/local/bin/flame-chromium

CMD ["sh", "-c", "chown -R node /app/data && node server.js"]
