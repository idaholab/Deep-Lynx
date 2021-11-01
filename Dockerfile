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

# Build the admin web app with the proper destination
RUN cd /srv/core_api/./AdminWebApp && npm install && npm run build -- --dest /srv/core_api/dist/http_server/web_gui

# Add docker-compose-wait tool ----------------------
USER root
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
RUN chmod +x /wait

EXPOSE 8080
CMD ["npm", "start"]
