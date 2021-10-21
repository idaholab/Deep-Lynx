FROM node:14

# Create the base directory and make user "node" the owner
RUN mkdir /srv/core_api && chown node:node /srv/core_api

WORKDIR /srv/core_api
COPY --chown=node:node package*.json ./

RUN npm install

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY --chown=node:node . .

# Add docker-compose-wait tool ----------------------
USER root
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
RUN chmod +x /wait

# install vue-cli as root
RUN npm install --global --unsafe-perm @vue/cli @vue/cli-service-global @vue/cli-plugin-typescript vue-cli-plugin-vuetify @vue/cli-plugin-vuex @vue/cli-plugin-router @vue/cli-plugin-eslint

USER node
ENV PATH="${PATH}:/usr/local/lib/node_modules/@vue/cli-service-global/node_modules/.bin"

EXPOSE 8080
CMD ["npm", "start-with-web"]
