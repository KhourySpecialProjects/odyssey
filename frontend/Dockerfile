FROM node:22-alpine

WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package*.json ./

RUN npm install --include=dev

COPY . .

CMD ["npm", "run", "dev"]