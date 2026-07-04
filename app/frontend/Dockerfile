FROM node:22-slim AS build

WORKDIR /app

# npm install (not npm ci): the committed package-lock.json is generated on
# Windows and omits Linux-only optional deps (e.g. @emnapi/core, lightningcss
# musl/gnu binaries), which makes the exact-match `npm ci` fail inside the image.
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
