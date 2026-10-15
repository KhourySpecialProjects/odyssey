FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache bash wget \
    && wget -qO- 'https://artifacts-cli.infisical.com/setup.apk.sh' | sh \
    && apk add --no-cache infisical

COPY package*.json ./

RUN npm install --include=dev

COPY . .

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
CMD ["npm", "run", "dev"]
