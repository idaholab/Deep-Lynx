FROM node:14

# Create the base directory and make user "node" the owner
RUN mkdir /srv/core_api && chown node:node /srv/core_api

WORKDIR /srv/core_api
COPY --chown=node:node package*.json ./

RUN npm install
RUN npm install --global --unsafe-perm @vue/cli

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY --chown=node:node . .

# Add docker-compose-wait tool ----------------------
USER root
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
RUN chmod +x /wait

USER node

EXPOSE 8080
CMD ["npm", "start-with-web"]
