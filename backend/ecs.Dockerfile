FROM --platform=linux/amd64 node:18.17.0-alpine
# Installing libvips-dev for sharp Compatibility
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev git jq

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /opt/

# Copy the entrypoint script into the container
# COPY set_env.sh /usr/local/bin/set_env.sh

# Make the script executable
# RUN chmod +x /usr/local/bin/set_env.sh

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
# ENTRYPOINT ["/usr/local/bin/set_env.sh"]
CMD ["npm", "run", "start"]