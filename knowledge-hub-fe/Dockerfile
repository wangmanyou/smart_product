FROM m.daocloud.io/docker.io/library/node:22-alpine3.19 AS build
RUN npm install -g pnpm
WORKDIR /frontend-app
COPY pnpm-lock.yaml ./
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm run build

FROM m.daocloud.io/docker.io/library/nginx:1.26-alpine3.19

COPY --from=build /frontend-app/dist /usr/share/nginx/html

COPY /nginx/nginx.conf.template /

ENV PROXY_PASS ""
EXPOSE 8080

CMD envsubst '$PROXY_PASS' < /nginx.conf.template > /etc/nginx/conf.d/default.conf && \
    cat /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
