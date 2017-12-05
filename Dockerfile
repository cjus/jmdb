FROM node:8.9.1-alpine
MAINTAINER Carlos Justiniano cjus34@gmail.com
EXPOSE 80
HEALTHCHECK --interval=5s --timeout=3s CMD curl -f http://localhost:80/v1/jmdb/health || exit 1
RUN apk add --update \
    curl \
    && rm -rf /var/cache/apk/*
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
ADD . /usr/src/app
RUN npm install -g pino-elasticsearch
RUN npm install --production
ENTRYPOINT ["node", "--nouse-idle-notification", "--expose-gc", "--max-old-space-size=8192", "index.js"]
