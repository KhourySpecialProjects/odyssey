FROM node:20-alpine
# Installing libvips-dev for sharp Compatibility
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev git wget
RUN wget -qO- 'https://artifacts-cli.infisical.com/setup.apk.sh' | sh \
    && apk add --no-cache infisical
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/
COPY package.json package-lock.json ./
RUN npm install -g node-gyp
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install
ENV PATH /opt/node_modules/.bin:$PATH
WORKDIR /opt/app
COPY . .
RUN chmod +x /opt/app/entrypoint.sh
RUN chown -R node:node /opt/app
USER node
RUN ["npm", "run", "build"]
EXPOSE 1337
ENTRYPOINT ["/bin/sh", "/opt/app/entrypoint.sh"]
CMD ["npm", "run", "dev"]
