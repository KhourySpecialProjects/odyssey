FROM node:20-alpine
# Installing libvips-dev for sharp Compatibility
# Minimal, reliable native-build toolchain for Node on Alpine 3.20/3.21
# RUN apk add --no-cache \
#     bash \
#     build-base \
#     autoconf automake libtool pkgconf \
#     zlib-dev libpng-dev nasm \
#     python3
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

WORKDIR /opt/
COPY package.json package-lock.json ./
RUN npm install -g node-gyp
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install
ENV PATH /opt/node_modules/.bin:$PATH

WORKDIR /opt/app
COPY . .
RUN chown -R node:node /opt/app
USER node
RUN ["npm", "run", "build"]
EXPOSE 1337
CMD ["npm", "run", "dev"]
